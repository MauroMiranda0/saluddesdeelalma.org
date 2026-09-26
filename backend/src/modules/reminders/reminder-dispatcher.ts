import { env } from "../../config/env";
import {
  whatsappGateway,
  type WhatsAppGateway
} from "../../integrations/whatsapp/whatsapp.gateway";
import { prisma } from "../../lib/prisma";
import { logger } from "../../lib/logger";
import { modalityLabel, therapyTypeLabel } from "../chatbot/response-templates";
import {
  failReminder,
  omitReminder,
  recoverStaleReminderClaims,
  sendReminder
} from "./reminders.service";

export const isPriorDayWindow = (now: Date) => {
  const hour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: env.REMINDER_TIMEZONE,
      hour: "2-digit",
      hourCycle: "h23"
    })
      .formatToParts(now)
      .find((part) => part.type === "hour")?.value
  );

  return hour >= 18 && hour < 19;
};

export const mexicoDayKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: env.REMINDER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return Date.UTC(value("year"), value("month") - 1, value("day"));
};

export const isPriorDayReminderDue = (now: Date, scheduledAt: Date) =>
  mexicoDayKey(scheduledAt) - mexicoDayKey(now) === 24 * 60 * 60_000 &&
  scheduledAt.getTime() >= now.getTime();

const appointmentSummary = (appointment: {
  scheduledAt: Date;
  modality: "online" | "presencial";
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
}) =>
  `${therapyTypeLabel(appointment.therapyType)} de ${appointment.durationMinutes} minutos, ${new Intl.DateTimeFormat(
    "es-MX",
    {
      timeZone: env.REMINDER_TIMEZONE,
      dateStyle: "full",
      timeStyle: "short"
    }
  ).format(
    appointment.scheduledAt
  )}, modalidad ${modalityLabel(appointment.modality)}`;

export const cancellationNoticeText = (appointment: { scheduledAt: Date }) =>
  `Le escribimos para informarle que su cita del ${new Intl.DateTimeFormat(
    "es-MX",
    { timeZone: env.REMINDER_TIMEZONE, dateStyle: "full", timeStyle: "short" }
  ).format(
    appointment.scheduledAt
  )} fue cancelada. Si desea reagendar, escríbanos por este medio y con gusto la apoyamos.`;

type DueReminder = {
  id: string;
  reminderType:
    | "recordatorio_24h"
    | "pago_pendiente"
    | "pago_pendiente_post_cita"
    | "cancelacion";
  recipient: "paciente" | "grupo_psicologas";
  attemptsCount: number;
  appointment: {
    scheduledAt: Date;
    modality: "online" | "presencial";
    therapyType: "individual" | "pareja" | "familiar";
    durationMinutes: number;
    status: string;
    patient: { whatsappPhone: string };
    payments: unknown[];
  };
};

const findDueReminders = async (now: Date): Promise<DueReminder[]> =>
  (await prisma.appointmentReminder.findMany({
    where: {
      status: { in: ["pendiente", "fallido"] },
      scheduledAt: { lte: now },
      attemptsCount: { lt: 3 },
      reminderType: {
        in: [
          "recordatorio_24h",
          "pago_pendiente",
          "pago_pendiente_post_cita",
          "cancelacion"
        ]
      }
    },
    include: {
      appointment: {
        include: {
          patient: true,
          payments: { where: { paymentType: "completo", status: "validado" } }
        }
      }
    }
  })) as DueReminder[];

type ReminderDispatcherDependencies = {
  findDueReminders: (now: Date) => Promise<DueReminder[]>;
  recoverStaleClaims: (now: Date) => Promise<void>;
  omitReminder: typeof omitReminder;
  failReminder: typeof failReminder;
  sendReminder: typeof sendReminder;
};

const defaultDependencies: ReminderDispatcherDependencies = {
  findDueReminders,
  recoverStaleClaims: recoverStaleReminderClaims,
  omitReminder,
  failReminder,
  sendReminder
};

export const dispatchDueReminders = async (input?: {
  now?: Date;
  gateway?: WhatsAppGateway;
  dependencies?: Partial<ReminderDispatcherDependencies>;
}) => {
  const now = input?.now ?? new Date();
  const gateway = input?.gateway ?? whatsappGateway;
  const dependencies = { ...defaultDependencies, ...input?.dependencies };
  await dependencies.recoverStaleClaims(now);
  const due = await dependencies.findDueReminders(now);

  for (const reminder of due) {
    try {
      const isCancellationReminder = reminder.reminderType === "cancelacion";
      const isPriorDayReminder =
        reminder.reminderType === "recordatorio_24h" ||
        reminder.reminderType === "pago_pendiente";
      const hasFullPayment = reminder.appointment.payments.length > 0;

      if (
        !isCancellationReminder &&
        (reminder.appointment.status === "cancelada" ||
          (reminder.reminderType !== "recordatorio_24h" && hasFullPayment))
      ) {
        await dependencies.omitReminder({
          reminderId: reminder.id,
          reason: "No notification is required"
        });
        continue;
      }

      if (
        isPriorDayReminder &&
        (!isPriorDayWindow(now) ||
          !isPriorDayReminderDue(now, reminder.appointment.scheduledAt))
      ) {
        if (isPriorDayReminderDue(now, reminder.appointment.scheduledAt)) {
          continue;
        }
        await dependencies.omitReminder({
          reminderId: reminder.id,
          reason: "Outside the prior-day reminder window"
        });
        continue;
      }

      const summary = appointmentSummary(reminder.appointment);
      const isGroup = reminder.recipient === "grupo_psicologas";
      const to = isGroup
        ? env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID
        : reminder.appointment.patient.whatsappPhone;

      if (!to) {
        await dependencies.failReminder({
          reminderId: reminder.id,
          reason: isGroup
            ? "Psychologists group destination is not configured"
            : "Patient destination is not configured",
          attemptsCount: reminder.attemptsCount
        });
        continue;
      }

      const text = isCancellationReminder
        ? cancellationNoticeText(reminder.appointment)
        : reminder.reminderType === "pago_pendiente_post_cita"
          ? "Gracias por asistir a su sesión. Le recordamos amablemente que su saldo continúa pendiente."
          : reminder.reminderType === "pago_pendiente"
            ? "Le recordamos que, si aplica, el saldo de su sesión puede liquidarse el día de la cita."
            : isGroup
              ? `Recordatorio interno: ${summary}.`
              : `Le recordamos su sesión: ${summary}. ¿Nos confirma su asistencia?`;

      await dependencies.sendReminder({
        reminderId: reminder.id,
        to,
        text,
        gateway,
        attemptsCount: reminder.attemptsCount
      });
    } catch (error) {
      logger.error(
        { error, reminderId: reminder.id },
        "Reminder delivery failed"
      );
    }
  }
};
