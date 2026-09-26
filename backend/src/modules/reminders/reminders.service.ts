import type { Appointment, Patient, Prisma } from "@prisma/client";

import { env } from "../../config/env";
import type { WhatsAppGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { prisma } from "../../lib/prisma";
import { createAuditLogInTransaction } from "../audit/audit.repository";
import {
  appointmentConfirmation,
  modalityLabel,
  therapyTypeLabel
} from "../chatbot/response-templates";
import { saveOutboundMessage } from "../chatbot/chat-messages.repository";

const MAX_REMINDER_ATTEMPTS = 3;
export const REMINDER_PROCESSING_LEASE_MS = 10 * 60_000;

export const reminderDto = (reminder: {
  id: string;
  reminderType:
    | "confirmacion"
    | "recordatorio_24h"
    | "cancelacion"
    | "pago_pendiente"
    | "pago_pendiente_post_cita";
  recipient: "paciente" | "grupo_psicologas";
  scheduledAt: Date;
  status: "pendiente" | "procesando" | "enviado" | "fallido" | "omitido";
  attemptsCount: number;
  lastError: string | null;
  sentAt: Date | null;
}) => ({
  id: reminder.id,
  reminderType: reminder.reminderType,
  recipient: reminder.recipient,
  scheduledAt: reminder.scheduledAt.toISOString(),
  status: reminder.status,
  attemptsCount: reminder.attemptsCount,
  lastError: reminder.lastError,
  sentAt: reminder.sentAt?.toISOString() ?? null
});

export const listAppointmentReminders = (appointmentId: string) =>
  prisma.appointmentReminder.findMany({
    where: { appointmentId },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }]
  });

const mexicoDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: env.REMINDER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour")
  };
};

export const previousDayReminderAt = (scheduledAt: Date) => {
  const { year, month, day } = mexicoDateParts(scheduledAt);
  const priorDayAtSixPm = new Date(Date.UTC(year, month - 1, day - 1, 18));
  const localParts = mexicoDateParts(priorDayAtSixPm);
  const offsetMs =
    Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour
    ) - priorDayAtSixPm.getTime();

  return new Date(priorDayAtSixPm.getTime() - offsetMs);
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
      attemptsCount: { lt: MAX_REMINDER_ATTEMPTS },
      // A message already delivered by the durable outbox fulfills this
      // reminder, so the worker must never send it a second time.
      outgoingEvents: { none: { status: "enviado" } }
    },
    data: { status: "procesando" }
  });

  return claimed.count === 1;
};

const reminderAudit = (input: {
  reminderId: string;
  action:
    | "appointment_reminder_omitted"
    | "appointment_reminder_retry"
    | "appointment_reminder_failed"
    | "appointment_reminder_sent";
  result: "success" | "failure";
  metadata: Prisma.InputJsonValue;
}) => ({
  actorChannel: "system" as const,
  action: input.action,
  entityType: "appointment_reminder",
  entityId: input.reminderId,
  result: input.result,
  metadata: input.metadata
});

type ScheduledReminderInput = {
  appointmentId: string;
  reminderType: "recordatorio_24h" | "pago_pendiente";
  recipient: "paciente" | "grupo_psicologas";
  scheduledAt: Date;
  status: "pendiente" | "omitido";
  lastError: string | null;
};

const upsertScheduledReminder = async (
  db: Prisma.TransactionClient | typeof prisma,
  input: ScheduledReminderInput
) => {
  const where = {
    appointmentId_reminderType_recipient: {
      appointmentId: input.appointmentId,
      reminderType: input.reminderType,
      recipient: input.recipient
    }
  };
  const reminder = await db.appointmentReminder.upsert({
    where,
    update: {},
    create: input
  });

  if (reminder.status === "omitido") {
    const existingAudit = await db.auditLog.findFirst({
      where: {
        entityId: reminder.id,
        action: "appointment_reminder_omitted"
      },
      select: { id: true }
    });

    if (!existingAudit) {
      await createAuditLogInTransaction(
        db as Prisma.TransactionClient,
        reminderAudit({
          reminderId: reminder.id,
          action: "appointment_reminder_omitted",
          result: "success",
          metadata: {
            reason:
              reminder.lastError ?? "Outside the prior-day reminder window",
            stage: "scheduling"
          }
        })
      );
    }
  }

  return reminder;
};

export const omitReminder = async (input: {
  reminderId: string;
  reason: string;
}) =>
  prisma.$transaction(async (transaction) => {
    const omitted = await transaction.appointmentReminder.updateMany({
      where: {
        id: input.reminderId,
        status: { in: ["pendiente", "fallido"] },
        attemptsCount: { lt: MAX_REMINDER_ATTEMPTS }
      },
      data: { status: "omitido", lastError: input.reason }
    });

    if (omitted.count === 1) {
      await createAuditLogInTransaction(
        transaction,
        reminderAudit({
          reminderId: input.reminderId,
          action: "appointment_reminder_omitted",
          result: "success",
          metadata: { reason: input.reason }
        })
      );
    }

    return omitted;
  });

export const failReminder = async (input: {
  reminderId: string;
  reason: string;
  attemptsCount?: number;
}) =>
  prisma.$transaction(async (transaction) => {
    const failed = await transaction.appointmentReminder.updateMany({
      where: {
        id: input.reminderId,
        status: { in: ["pendiente", "procesando", "fallido"] },
        attemptsCount: { lt: MAX_REMINDER_ATTEMPTS }
      },
      data: {
        status: "fallido",
        attemptsCount: { increment: 1 },
        lastError: input.reason
      }
    });

    if (failed.count === 1) {
      const attemptsCount = (input.attemptsCount ?? 0) + 1;
      await createAuditLogInTransaction(
        transaction,
        reminderAudit({
          reminderId: input.reminderId,
          action:
            attemptsCount >= MAX_REMINDER_ATTEMPTS
              ? "appointment_reminder_failed"
              : "appointment_reminder_retry",
          result: "failure",
          metadata: { reason: input.reason, attemptsCount }
        })
      );
    }

    return failed;
  });

export const recoverStaleReminderClaims = async (now: Date) => {
  const staleBefore = new Date(now.getTime() - REMINDER_PROCESSING_LEASE_MS);
  const staleClaims = await prisma.appointmentReminder.findMany({
    where: {
      status: "procesando",
      updatedAt: { lte: staleBefore }
    },
    select: { id: true, attemptsCount: true }
  });

  for (const claim of staleClaims) {
    const reason = "Recovered stale processing claim";
    await prisma.$transaction(async (transaction) => {
      if (claim.attemptsCount >= MAX_REMINDER_ATTEMPTS) {
        const recovered = await transaction.appointmentReminder.updateMany({
          where: {
            id: claim.id,
            status: "procesando",
            updatedAt: { lte: staleBefore }
          },
          data: { status: "fallido", lastError: reason }
        });

        if (recovered.count === 1) {
          await createAuditLogInTransaction(
            transaction,
            reminderAudit({
              reminderId: claim.id,
              action: "appointment_reminder_failed",
              result: "failure",
              metadata: { reason, attemptsCount: claim.attemptsCount }
            })
          );
        }
        return;
      }

      const recovered = await transaction.appointmentReminder.updateMany({
        where: {
          id: claim.id,
          status: "procesando",
          updatedAt: { lte: staleBefore },
          attemptsCount: { lt: MAX_REMINDER_ATTEMPTS }
        },
        data: {
          status: "fallido",
          attemptsCount: { increment: 1 },
          lastError: reason
        }
      });

      if (recovered.count === 1) {
        const attemptsCount = claim.attemptsCount + 1;
        await createAuditLogInTransaction(
          transaction,
          reminderAudit({
            reminderId: claim.id,
            action:
              attemptsCount >= MAX_REMINDER_ATTEMPTS
                ? "appointment_reminder_failed"
                : "appointment_reminder_retry",
            result: "failure",
            metadata: { reason, attemptsCount }
          })
        );
      }
    });
  }
};

export const sendReminder = async (input: {
  reminderId: string;
  to: string;
  text: string;
  gateway: WhatsAppGateway;
  attemptsCount?: number;
}) => {
  if (!(await claimReminder(input.reminderId))) {
    return null;
  }

  try {
    const sent = await input.gateway.sendText({
      to: input.to,
      text: input.text
    });
    await prisma.$transaction(async (transaction) => {
      await transaction.appointmentReminder.update({
        where: { id: input.reminderId },
        data: {
          status: "enviado",
          sentAt: new Date(),
          providerMessageId: sent.messageId
        }
      });
      await createAuditLogInTransaction(
        transaction,
        reminderAudit({
          reminderId: input.reminderId,
          action: "appointment_reminder_sent",
          result: "success",
          metadata: { providerMessageId: sent.messageId }
        })
      );
    });
    return sent;
  } catch (error) {
    await failReminder({
      reminderId: input.reminderId,
      reason: error instanceof Error ? error.message : "Unknown send error",
      attemptsCount: input.attemptsCount
    });
    throw error;
  }
};

export const markQueuedReminderSent = async (input: {
  reminderId: string;
  providerMessageId: string;
}) =>
  prisma.$transaction(async (transaction) => {
    const sent = await transaction.appointmentReminder.updateMany({
      where: {
        id: input.reminderId,
        status: { in: ["pendiente", "procesando", "fallido"] }
      },
      data: {
        status: "enviado",
        sentAt: new Date(),
        providerMessageId: input.providerMessageId,
        lastError: null
      }
    });

    if (sent.count === 1) {
      await createAuditLogInTransaction(
        transaction,
        reminderAudit({
          reminderId: input.reminderId,
          action: "appointment_reminder_sent",
          result: "success",
          metadata: {
            providerMessageId: input.providerMessageId,
            channel: "outbox"
          }
        })
      );
    }

    return sent;
  });

export const scheduleAppointmentReminders = async (
  appointment: Appointment,
  db: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const scheduledAt = previousDayReminderAt(appointment.scheduledAt);
  const status = scheduledAt <= new Date() ? "omitido" : "pendiente";
  const lastError =
    status === "omitido" ? "Created after the prior-day reminder window" : null;

  await upsertScheduledReminder(db, {
    appointmentId: appointment.id,
    reminderType: "recordatorio_24h",
    recipient: "paciente",
    scheduledAt,
    status,
    lastError
  });
  await upsertScheduledReminder(db, {
    appointmentId: appointment.id,
    reminderType: "recordatorio_24h",
    recipient: "grupo_psicologas",
    scheduledAt,
    status,
    lastError
  });
};

export const schedulePriorDayPaymentReminder = async (
  appointment: Pick<Appointment, "id" | "scheduledAt">,
  db: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const fullPayment = await db.payment.findFirst({
    where: {
      appointmentId: appointment.id,
      paymentType: "completo",
      status: "validado"
    },
    select: { id: true }
  });

  if (fullPayment) {
    return null;
  }

  const scheduledAt = previousDayReminderAt(appointment.scheduledAt);
  const status = scheduledAt <= new Date() ? "omitido" : "pendiente";
  const lastError =
    status === "omitido" ? "Created after the prior-day reminder window" : null;

  // An advance still leaves a balance, so only a validated full payment
  // suppresses this reminder.
  return upsertScheduledReminder(db, {
    appointmentId: appointment.id,
    reminderType: "pago_pendiente",
    recipient: "paciente",
    scheduledAt,
    status,
    lastError
  });
};

export const scheduleCancellationNotice = async (
  appointmentId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) => {
  return db.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId,
        reminderType: "cancelacion",
        recipient: "paciente"
      }
    },
    update: {},
    create: {
      appointmentId,
      reminderType: "cancelacion",
      recipient: "paciente",
      scheduledAt: new Date()
    }
  });
};

export const findCancellationNoticeReminder = async (appointmentId: string) =>
  prisma.appointmentReminder.findUnique({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId,
        reminderType: "cancelacion",
        recipient: "paciente"
      }
    },
    select: { id: true }
  });

export const ensureConfirmationReminders = async (
  appointment: { id: string },
  db: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const patientReminder = await db.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId: appointment.id,
        reminderType: "confirmacion",
        recipient: "paciente"
      }
    },
    update: {},
    create: {
      appointmentId: appointment.id,
      reminderType: "confirmacion",
      recipient: "paciente",
      scheduledAt: new Date()
    }
  });
  const groupReminder = await db.appointmentReminder.upsert({
    where: {
      appointmentId_reminderType_recipient: {
        appointmentId: appointment.id,
        reminderType: "confirmacion",
        recipient: "grupo_psicologas"
      }
    },
    update: {},
    create: {
      appointmentId: appointment.id,
      reminderType: "confirmacion",
      recipient: "grupo_psicologas",
      scheduledAt: new Date()
    }
  });

  return { patientReminder, groupReminder };
};

export const sendAppointmentConfirmation = async (input: {
  appointment: Appointment;
  patient: Patient;
  conversationId: string;
  gateway: WhatsAppGateway;
  queueOutboundMessage?: (input: {
    to: string;
    text: string;
    conversationId: string;
    intent: "book";
    reminderId?: string;
  }) => Promise<unknown>;
}) => {
  const { patientReminder, groupReminder } = await ensureConfirmationReminders(
    input.appointment
  );
  const text = appointmentConfirmation(input.appointment, input.patient);

  try {
    if (input.queueOutboundMessage) {
      // The durable outbox owns delivery, so each message carries the
      // reminder row it fulfills and the inbox worker reports the outcome.
      await input.queueOutboundMessage({
        to: input.patient.whatsappPhone,
        text,
        conversationId: input.conversationId,
        intent: "book",
        reminderId: patientReminder.id
      });

      if (env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) {
        await input.queueOutboundMessage({
          to: env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID,
          text: groupConfirmation(input.appointment),
          conversationId: input.conversationId,
          intent: "book",
          reminderId: groupReminder.id
        });
      } else {
        await failReminder({
          reminderId: groupReminder.id,
          reason: "Group destination is not configured",
          attemptsCount: groupReminder.attemptsCount
        });
      }
      return;
    }

    const sentPatientMessage = await sendReminder({
      reminderId: patientReminder.id,
      to: input.patient.whatsappPhone,
      text,
      gateway: input.gateway,
      attemptsCount: patientReminder.attemptsCount
    });

    if (sentPatientMessage) {
      await saveOutboundMessage({
        conversationId: input.conversationId,
        waMessageId: sentPatientMessage.messageId,
        contentText: text,
        intent: "book"
      });
    }

    if (env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) {
      await sendReminder({
        reminderId: groupReminder.id,
        to: env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID,
        text: groupConfirmation(input.appointment),
        gateway: input.gateway,
        attemptsCount: groupReminder.attemptsCount
      });
    } else {
      await failReminder({
        reminderId: groupReminder.id,
        reason: "Group destination is not configured",
        attemptsCount: groupReminder.attemptsCount
      });
    }
  } finally {
    // Scheduling the prior-day reminders must not depend on the outcome of
    // the immediate confirmation sends.
    await scheduleAppointmentReminders(input.appointment);
  }
};

export const dispatchAppointmentConfirmation = async (input: {
  appointment: Appointment;
  patient: Pick<Patient, "whatsappPhone" | "fullName">;
  gateway: WhatsAppGateway;
  confirmationReminders?: Awaited<
    ReturnType<typeof ensureConfirmationReminders>
  >;
}) => {
  const { patientReminder, groupReminder } =
    input.confirmationReminders ??
    (await ensureConfirmationReminders(input.appointment));
  const text = appointmentConfirmation(input.appointment, input.patient);

  const deliveries: Array<PromiseLike<unknown>> = [
    sendReminder({
      reminderId: patientReminder.id,
      to: input.patient.whatsappPhone,
      text,
      gateway: input.gateway,
      attemptsCount: patientReminder.attemptsCount
    })
  ];

  if (env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) {
    deliveries.push(
      sendReminder({
        reminderId: groupReminder.id,
        to: env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID,
        text: groupConfirmation(input.appointment),
        gateway: input.gateway,
        attemptsCount: groupReminder.attemptsCount
      })
    );
  } else {
    deliveries.push(
      failReminder({
        reminderId: groupReminder.id,
        reason: "Group destination is not configured",
        attemptsCount: groupReminder.attemptsCount
      })
    );
  }

  // Each recipient has an independent durable delivery row. A provider
  // failure updates only its row and must not prevent the other delivery.
  await Promise.allSettled(deliveries);
};

export const createPostCompletionPaymentReminder = async (
  appointmentId: string,
  db: Prisma.TransactionClient | typeof prisma = prisma
) => {
  const appointment = await db.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      payments: { where: { paymentType: "completo", status: "validado" } }
    }
  });

  if (appointment.payments.length > 0) {
    return null;
  }

  return db.appointmentReminder.upsert({
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
