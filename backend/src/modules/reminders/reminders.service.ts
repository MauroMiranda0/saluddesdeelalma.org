import type { Appointment, Patient } from "@prisma/client";

import { env } from "../../config/env";
import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { prisma } from "../../lib/prisma";
import {
  appointmentConfirmation,
  modalityLabel,
  therapyTypeLabel
} from "../chatbot/response-templates";
import { saveOutboundMessage } from "../chatbot/chat-messages.repository";

const mexicoDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: env.REMINDER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
};

export const previousDayReminderAt = (scheduledAt: Date) => {
  const { year, month, day } = mexicoDateParts(scheduledAt);
  // Mexico City is UTC-6 year-round; this is 18:00 on the preceding local day.
  return new Date(Date.UTC(year, month - 1, day));
};

const groupConfirmation = (appointment: Appointment) =>
  `Nueva cita ${therapyTypeLabel(appointment.therapyType)} de ${appointment.durationMinutes} minutos: ${new Intl.DateTimeFormat(
    "es-MX",
    {
      timeZone: env.REMINDER_TIMEZONE,
      dateStyle: "full",
      timeStyle: "short"
    }
  ).format(appointment.scheduledAt)}, ${modalityLabel(appointment.modality)}.`;

const claimReminder = async (id: string) => {
  const claimed = await prisma.appointmentReminder.updateMany({
    where: {
      id,
      status: { in: ["pendiente", "fallido"] },
      attemptsCount: { lt: 3 }
    },
    data: { status: "procesando" }
  });

  return claimed.count === 1;
};

export const sendReminder = async (input: {
  reminderId: string;
  to: string;
  text: string;
  gateway: WhatsAppGateway;
}) => {
  if (!(await claimReminder(input.reminderId))) {
    return null;
  }

  try {
    const sent = await input.gateway.sendText({
      to: input.to,
      text: input.text
    });
    await prisma.appointmentReminder.update({
      where: { id: input.reminderId },
      data: {
        status: "enviado",
        sentAt: new Date(),
        providerMessageId: sent.messageId
      }
    });
    return sent;
  } catch (error) {
    await prisma.appointmentReminder.update({
      where: { id: input.reminderId },
      data: {
        status: "fallido",
        attemptsCount: { increment: 1 },
        lastError: error instanceof Error ? error.message : "Unknown send error"
      }
    });
    throw error;
  }
};

export const scheduleAppointmentReminders = async (
  appointment: Appointment
) => {
  const scheduledAt = previousDayReminderAt(appointment.scheduledAt);
  const status = scheduledAt <= new Date() ? "omitido" : "pendiente";
  const lastError =
    status === "omitido" ? "Created after the prior-day reminder window" : null;

  await prisma.$transaction([
    prisma.appointmentReminder.upsert({
      where: {
        appointmentId_reminderType_recipient: {
          appointmentId: appointment.id,
          reminderType: "recordatorio_24h",
          recipient: "paciente"
        }
      },
      update: {},
      create: {
        appointmentId: appointment.id,
        reminderType: "recordatorio_24h",
        recipient: "paciente",
        scheduledAt,
        status,
        lastError
      }
    }),
    prisma.appointmentReminder.upsert({
      where: {
        appointmentId_reminderType_recipient: {
          appointmentId: appointment.id,
          reminderType: "recordatorio_24h",
          recipient: "grupo_psicologas"
        }
      },
      update: {},
      create: {
        appointmentId: appointment.id,
        reminderType: "recordatorio_24h",
        recipient: "grupo_psicologas",
        scheduledAt,
        status,
        lastError
      }
    }),
    // The dispatcher omits this first payment notice if the balance is settled.
    prisma.appointmentReminder.upsert({
      where: {
        appointmentId_reminderType_recipient: {
          appointmentId: appointment.id,
          reminderType: "pago_pendiente",
          recipient: "paciente"
        }
      },
      update: {},
      create: {
        appointmentId: appointment.id,
        reminderType: "pago_pendiente",
        recipient: "paciente",
        scheduledAt,
        status,
        lastError
      }
    })
  ]);
};

export const sendAppointmentConfirmation = async (input: {
  appointment: Appointment;
  patient: Patient;
  conversationId: string;
  gateway: WhatsAppGateway;
}) => {
  const patientReminder = await prisma.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId: input.appointment.id,
        reminderType: "confirmacion",
        recipient: "paciente"
      }
    },
    update: {},
    create: {
      appointmentId: input.appointment.id,
      reminderType: "confirmacion",
      recipient: "paciente",
      scheduledAt: new Date()
    }
  });
  const groupReminder = await prisma.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId: input.appointment.id,
        reminderType: "confirmacion",
        recipient: "grupo_psicologas"
      }
    },
    update: {},
    create: {
      appointmentId: input.appointment.id,
      reminderType: "confirmacion",
      recipient: "grupo_psicologas",
      scheduledAt: new Date()
    }
  });
  const text = appointmentConfirmation(input.appointment, input.patient);

  const sentPatientMessage = await sendReminder({
    reminderId: patientReminder.id,
    to: input.patient.whatsappPhone,
    text,
    gateway: input.gateway
  });

  if (!env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) {
    throw new Error("Psychologists group destination is not configured");
  }
  await sendReminder({
    reminderId: groupReminder.id,
    to: env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID,
    text: groupConfirmation(input.appointment),
    gateway: input.gateway
  });

  if (sentPatientMessage) {
    await saveOutboundMessage({
      conversationId: input.conversationId,
      waMessageId: sentPatientMessage.messageId,
      contentText: text,
      intent: "book"
    });
  }
  await scheduleAppointmentReminders(input.appointment);
};

export const createPostCompletionPaymentReminder = async (
  appointmentId: string
) => {
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      payments: { where: { paymentType: "completo", status: "validado" } }
    }
  });

  if (appointment.payments.length > 0) {
    return null;
  }

  return prisma.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId,
        reminderType: "pago_pendiente_post_cita",
        recipient: "paciente"
      }
    },
    update: {},
    create: {
      appointmentId,
      reminderType: "pago_pendiente_post_cita",
      recipient: "paciente",
      scheduledAt: new Date()
    }
  });
};
