import { env } from "../../config/env";
import {
  whatsappGateway,
  type WhatsAppGateway
} from "../../integrations/whatsapp/whatsapp.gateway";
import { prisma } from "../../lib/prisma";
import { modalityLabel, therapyTypeLabel } from "../chatbot/response-templates";
import { sendReminder } from "./reminders.service";

const isPriorDayWindow = (now: Date) => {
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

  return value("year") * 10000 + value("month") * 100 + value("day");
};

export const isPriorDayReminderDue = (now: Date, scheduledAt: Date) =>
  mexicoDayKey(scheduledAt) - mexicoDayKey(now) === 1 &&
  scheduledAt.getTime() > now.getTime();

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

export const dispatchDueReminders = async (input?: {
  now?: Date;
  gateway?: WhatsAppGateway;
}) => {
  const now = input?.now ?? new Date();
  const gateway = input?.gateway ?? whatsappGateway;
  const due = await prisma.appointmentReminder.findMany({
    where: {
      status: { in: ["pendiente", "fallido"] },
      scheduledAt: { lte: now },
      attemptsCount: { lt: 3 },
      reminderType: {
        in: ["recordatorio_24h", "pago_pendiente", "pago_pendiente_post_cita"]
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
  });

  for (const reminder of due) {
    const isPriorDayReminder =
      reminder.reminderType === "recordatorio_24h" ||
      reminder.reminderType === "pago_pendiente";
    const hasFullPayment = reminder.appointment.payments.length > 0;

    if (
      reminder.appointment.status === "cancelada" ||
      (reminder.reminderType !== "recordatorio_24h" && hasFullPayment)
    ) {
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: { status: "omitido", lastError: "No notification is required" }
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
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: "omitido",
          lastError: "Outside the prior-day reminder window"
        }
      });
      continue;
    }

    const summary = appointmentSummary(reminder.appointment);
    const isGroup = reminder.recipient === "grupo_psicologas";
    const to = isGroup
      ? env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID
      : reminder.appointment.patient.whatsappPhone;

    if (!to) {
      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: {
          status: "fallido",
          lastError: "Psychologists group destination is not configured"
        }
      });
      continue;
    }

    const text =
      reminder.reminderType === "pago_pendiente_post_cita"
        ? "Gracias por asistir a su sesión. Le recordamos amablemente que su saldo continúa pendiente."
        : reminder.reminderType === "pago_pendiente"
          ? "Le recordamos que, si aplica, el saldo de su sesión puede liquidarse el día de la cita."
          : isGroup
            ? `Recordatorio interno: ${summary}.`
            : `Le recordamos su sesión: ${summary}. ¿Nos confirma su asistencia?`;

    await sendReminder({ reminderId: reminder.id, to, text, gateway });
  }
};
