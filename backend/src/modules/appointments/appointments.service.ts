import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { CreateAppointmentInput } from "../../lib/validators/appointment";
import type { PatientInput } from "../../lib/validators/patient";
import {
  findOrCreatePatient,
  findPatientWithAssignedTherapist
} from "../patients/patients.service";
import {
  createAuditLogInTransaction,
  type AuditCreateInput
} from "../audit/audit.repository";
import {
  findActiveAppointmentsForTherapist,
  findAppointmentForAdmin,
  findExistingWhatsAppBooking,
  findOverlappingActiveAppointment,
  listAppointmentsInRange
} from "./appointments.repository";
import {
  createPostCompletionPaymentReminder,
  dispatchAppointmentConfirmation,
  ensureConfirmationReminders,
  previousDayReminderAt,
  scheduleAppointmentReminders,
  scheduleCancellationNotice
} from "../reminders/reminders.service";
import {
  whatsappGateway,
  type WhatsAppGateway
} from "../../integrations/whatsapp/whatsapp.gateway";
import { paymentDto } from "../payments/payments.service";

const mexicoTimeZone = "America/Mexico_City";
const hourFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: mexicoTimeZone,
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23"
});

export class AppointmentConflictError extends Error {}
export class AppointmentScheduleError extends Error {}
export class ManualExceptionConfirmationRequiredError extends AppointmentScheduleError {}
export class TherapistAssignmentRequiredError extends Error {}
export class AppointmentNotFoundError extends Error {}
export class AppointmentNotMutableError extends Error {}

export const therapyDurationMinutes = (
  therapyType: CreateAppointmentInput["therapyType"]
) => (therapyType === "individual" ? 60 : 90);

const localTimeParts = (scheduledAt: Date) => {
  const parts = hourFormatter.formatToParts(scheduledAt);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;

  return {
    weekday: value("weekday"),
    hour: Number(value("hour")),
    minute: Number(value("minute"))
  };
};

export const isRegularAppointmentSchedule = (
  scheduledAt: Date,
  durationMinutes = 60
) => {
  const { weekday, hour } = localTimeParts(scheduledAt);
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const end = localTimeParts(endsAt);

  return !(
    weekday === "Sat" ||
    weekday === "Sun" ||
    hour < 9 ||
    end.weekday !== weekday ||
    end.hour > 21 ||
    (end.hour === 21 && end.minute !== 0)
  );
};

export const assertWhatsAppAppointmentSchedule = (
  scheduledAt: Date,
  durationMinutes = 60
) => {
  if (!isRegularAppointmentSchedule(scheduledAt, durationMinutes)) {
    throw new AppointmentScheduleError(
      "WhatsApp appointments must fit Monday through Friday from 09:00 to 21:00 and end by 21:00"
    );
  }
};

const isActiveAppointmentConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2002" ||
    (error.code === "P2010" && error.meta?.code === "23P01"));

const assertTherapistAvailability = async (input: {
  therapistId: string;
  scheduledAt: Date;
  endsAt: Date;
  excludeAppointmentId?: string;
}) => {
  const conflict = await findOverlappingActiveAppointment(input);

  if (conflict) {
    throw new AppointmentConflictError(
      "The requested appointment slot is unavailable"
    );
  }
};

export const createWhatsAppAppointment = async (
  input: CreateAppointmentInput & { audit?: AuditCreateInput }
) => {
  const scheduledAt = new Date(input.scheduledAt);
  const durationMinutes = therapyDurationMinutes(input.therapyType);
  assertWhatsAppAppointmentSchedule(scheduledAt, durationMinutes);

  const patient = await findOrCreatePatient(input.patient);
  const patientWithTherapist = await findPatientWithAssignedTherapist(
    patient.whatsappPhone
  );
  const therapistId = patientWithTherapist?.assignedTherapistId;

  if (!therapistId || !patientWithTherapist?.assignedTherapist?.isActive) {
    throw new TherapistAssignmentRequiredError(
      "An admin must assign an active therapist before booking this patient"
    );
  }
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  // A durable retry may re-run this booking after the appointment was already
  // persisted. Reuse that exact slot instead of creating a duplicate reserva
  // or a duplicate audit of the creation.
  const existing = await findExistingWhatsAppBooking({
    patientId: patient.id,
    scheduledAt,
    endsAt
  });
  if (existing) {
    return { appointment: existing, patient };
  }

  await assertTherapistAvailability({ therapistId, scheduledAt, endsAt });

  try {
    const appointment = await prisma.$transaction(async (transaction) => {
      const created = await transaction.appointment.create({
        data: {
          patientId: patient.id,
          therapistId,
          scheduledAt,
          endsAt,
          therapyType: input.therapyType,
          durationMinutes,
          modality: input.modality,
          isManualException: false,
          locationLabel: input.locationLabel,
          meetingLink: input.meetingLink,
          createdVia: "whatsapp"
        }
      });

      if (input.audit) {
        await createAuditLogInTransaction(transaction, {
          ...input.audit,
          entityId: created.id
        });
      }

      // Booking reminders must exist atomically with the appointment so a
      // crash between commit and the confirmation send cannot leave a
      // confirmed cita without scheduled prior-day reminders.
      await ensureConfirmationReminders(created, transaction);
      await scheduleAppointmentReminders(created, transaction);

      return created;
    });

    return { appointment, patient };
  } catch (error) {
    if (isActiveAppointmentConflict(error)) {
      throw new AppointmentConflictError(
        "The requested appointment slot is unavailable"
      );
    }

    throw error;
  }
};

const mexicoDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: mexicoTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return { year: value("year"), month: value("month"), day: value("day") };
};

export const findNextAvailableSlots = async (
  therapistId: string,
  therapyType: CreateAppointmentInput["therapyType"],
  count = 3
) => {
  const now = new Date();
  const occupied = await findActiveAppointmentsForTherapist(therapistId, now);
  const durationMinutes = therapyDurationMinutes(therapyType);
  const slots: Date[] = [];
  const { year, month, day } = mexicoDate(now);
  const firstDay = new Date(Date.UTC(year, month - 1, day));

  for (
    let dayOffset = 0;
    dayOffset < 21 && slots.length < count;
    dayOffset += 1
  ) {
    const dayAtUtc = new Date(firstDay);
    dayAtUtc.setUTCDate(firstDay.getUTCDate() + dayOffset);
    const weekday = dayAtUtc.getUTCDay();

    if (weekday === 0 || weekday === 6) {
      continue;
    }

    for (
      let slotMinute = 9 * 60;
      slotMinute < 21 * 60 && slots.length < count;
      slotMinute += 15
    ) {
      const slot = new Date(
        Date.UTC(
          dayAtUtc.getUTCFullYear(),
          dayAtUtc.getUTCMonth(),
          dayAtUtc.getUTCDate(),
          Math.floor(slotMinute / 60) + 6,
          slotMinute % 60
        )
      );

      const endsAt = new Date(slot.getTime() + durationMinutes * 60_000);
      const end = localTimeParts(endsAt);
      const overlaps = occupied.some(
        (appointment) =>
          slot < appointment.endsAt && endsAt > appointment.scheduledAt
      );

      if (
        slot > now &&
        end.weekday !== "Sat" &&
        end.weekday !== "Sun" &&
        (end.hour < 21 || (end.hour === 21 && end.minute === 0)) &&
        !overlaps
      ) {
        slots.push(slot);
      }
    }
  }

  return slots;
};

export const completeAppointmentWithAudit = async (input: {
  appointmentId: string;
  audit: AuditCreateInput;
}) => {
  const current = await findAppointmentForAdmin(input.appointmentId);

  if (!current) {
    throw new AppointmentNotFoundError("Appointment does not exist");
  }

  if (current.status === "cancelada" || current.scheduledAt > new Date()) {
    throw new AppointmentNotMutableError(
      "Only started appointments can be completed"
    );
  }

  // Completion is the only event that schedules the priority post-session
  // notice; the mutation, reminder and audit log are written atomically.
  return prisma.$transaction(async (transaction) => {
    const appointment = await transaction.appointment.update({
      where: { id: input.appointmentId },
      data: { status: "completada", completedAt: new Date() }
    });
    await createPostCompletionPaymentReminder(appointment.id, transaction);
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      entityId: appointment.id
    });
    return appointment;
  });
};

export type PaymentSignal = {
  paymentType: "anticipo" | "completo";
  status: "pendiente_validacion" | "validado" | "rechazado";
};

export const paymentStatusOf = (payments: PaymentSignal[]) => {
  if (
    payments.some(
      (payment) =>
        payment.paymentType === "completo" && payment.status === "validado"
    )
  ) {
    return "completado";
  }

  if (payments.some((payment) => payment.paymentType === "anticipo")) {
    return "anticipo";
  }

  return "pendiente";
};

type AppointmentWithRelations = {
  id: string;
  scheduledAt: Date;
  endsAt: Date;
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
  modality: "online" | "presencial";
  status: "programada" | "confirmada" | "completada" | "cancelada";
  isManualException: boolean;
  locationLabel: string | null;
  meetingLink: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  cancellationNotice: "a_tiempo" | "tardia" | null;
  createdVia: "whatsapp" | "panel" | "system";
  completedAt: Date | null;
  patient: {
    id: string;
    fullName: string;
    whatsappPhone: string;
    birthdate: Date | null;
  };
  therapist: {
    id: string;
    isActive: boolean;
    user: { fullName: string } | null;
  } | null;
  payments?: Array<
    PaymentSignal & {
      id: string;
      amount: { toString(): string };
      method: "transferencia" | "efectivo";
      proofReference: string | null;
      paidAt: Date | null;
      createdAt: Date;
    }
  >;
};

export const appointmentCalendarDto = (
  appointment: AppointmentWithRelations
) => ({
  id: appointment.id,
  scheduledAt: appointment.scheduledAt.toISOString(),
  endsAt: appointment.endsAt.toISOString(),
  therapyType: appointment.therapyType,
  durationMinutes: appointment.durationMinutes,
  modality: appointment.modality,
  status: appointment.status,
  isManualException: appointment.isManualException,
  locationLabel: appointment.locationLabel,
  meetingLink: appointment.meetingLink,
  cancelReason: appointment.cancelReason,
  cancelledAt: appointment.cancelledAt?.toISOString() ?? null,
  cancellationNotice: appointment.cancellationNotice,
  createdVia: appointment.createdVia,
  paymentStatus: paymentStatusOf(appointment.payments ?? []),
  payments: (appointment.payments ?? []).map(paymentDto),
  patientId: appointment.patient.id,
  patientName: appointment.patient.fullName,
  patientPhone: appointment.patient.whatsappPhone,
  patientBirthdate: appointment.patient.birthdate
    ? appointment.patient.birthdate.toISOString().slice(0, 10)
    : null,
  therapistId: appointment.therapist?.id ?? null,
  therapistName: appointment.therapist?.user?.fullName ?? null,
  therapistIsActive: appointment.therapist?.isActive ?? false
});

export const listAppointmentsForCalendar = (from: Date, to: Date) => {
  return listAppointmentsInRange(from, to).then((appointments) =>
    appointments.map(appointmentCalendarDto)
  );
};

export const cancellationNoticeFor = (
  scheduledAt: Date,
  cancelledAt: Date
): "a_tiempo" | "tardia" => {
  const dayBeforeScheduled = scheduledAt.getTime() - 24 * 60 * 60 * 1000;

  return cancelledAt.getTime() <= dayBeforeScheduled ? "a_tiempo" : "tardia";
};

const resolvePanelPatient = async (input: {
  patientId?: string;
  newPatient?: PatientInput;
}) => {
  let patient;

  if (input.patientId) {
    patient = await prisma.patient.findUnique({
      where: { id: input.patientId },
      include: { assignedTherapist: { include: { user: true } } }
    });

    if (!patient) {
      throw new AppointmentNotFoundError("Patient does not exist");
    }

    return patient;
  }

  const created = await findOrCreatePatient(input.newPatient!);
  patient = await findPatientWithAssignedTherapist(created.whatsappPhone);

  return {
    ...created,
    assignedTherapist: patient?.assignedTherapist
      ? {
          id: patient.assignedTherapist.id,
          isActive: patient.assignedTherapist.isActive,
          user: null
        }
      : null
  };
};

export const createPanelAppointmentWithAudit = async (input: {
  patient: { patientId?: string; newPatient?: PatientInput };
  scheduledAt: Date;
  modality: "online" | "presencial";
  therapyType: "individual" | "pareja" | "familiar";
  isManualException: boolean;
  locationLabel?: string;
  meetingLink?: string;
  actorUserId?: string;
  confirmationGateway?: WhatsAppGateway;
  audit: AuditCreateInput;
}) => {
  const patient = await resolvePanelPatient(input.patient);

  if (!patient.assignedTherapistId || !patient.assignedTherapist?.isActive) {
    throw new TherapistAssignmentRequiredError(
      "An admin must assign an active therapist before booking this patient"
    );
  }

  const durationMinutes = therapyDurationMinutes(input.therapyType);
  const scheduledAt = input.scheduledAt;
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  if (!input.isManualException) {
    try {
      assertWhatsAppAppointmentSchedule(scheduledAt, durationMinutes);
    } catch (error) {
      if (error instanceof AppointmentScheduleError) {
        throw new AppointmentScheduleError(
          "Panel appointments must fit the regular schedule or be marked as a manual exception"
        );
      }
      throw error;
    }
  }

  await assertTherapistAvailability({
    therapistId: patient.assignedTherapistId,
    scheduledAt,
    endsAt
  });

  let appointment;
  let confirmationReminders;

  try {
    const createdWithReminders = await prisma.$transaction(
      async (transaction) => {
        const created = await transaction.appointment.create({
          data: {
            patientId: patient.id,
            therapistId: patient.assignedTherapistId!,
            scheduledAt,
            endsAt,
            therapyType: input.therapyType,
            durationMinutes,
            modality: input.modality,
            isManualException: input.isManualException,
            locationLabel: input.locationLabel,
            meetingLink: input.meetingLink,
            createdVia: "panel",
            createdByUserId: input.actorUserId
          },
          include: {
            patient: {
              select: {
                id: true,
                fullName: true,
                whatsappPhone: true,
                birthdate: true
              }
            },
            therapist: {
              select: {
                id: true,
                isActive: true,
                user: { select: { fullName: true } }
              }
            }
          }
        });
        // These rows are part of the booking commit so delivery can be retried
        // and inspected even if a process stops immediately after committing.
        const confirmations = await ensureConfirmationReminders(
          created,
          transaction
        );
        await scheduleAppointmentReminders(created, transaction);
        await createAuditLogInTransaction(transaction, {
          ...input.audit,
          entityId: created.id
        });
        return { appointment: created, confirmations };
      }
    );
    appointment = createdWithReminders.appointment;
    confirmationReminders = createdWithReminders.confirmations;
  } catch (error) {
    if (isActiveAppointmentConflict(error)) {
      throw new AppointmentConflictError(
        "The requested appointment slot is unavailable"
      );
    }
    throw error;
  }

  await dispatchAppointmentConfirmation({
    appointment,
    patient: appointment.patient,
    gateway: input.confirmationGateway ?? whatsappGateway,
    confirmationReminders
  });

  return appointment;
};

export const rescheduleAppointmentWithAudit = async (input: {
  appointmentId: string;
  scheduledAt: Date;
  modality?: "online" | "presencial";
  therapyType?: "individual" | "pareja" | "familiar";
  manualExceptionConfirmed: boolean;
  audit: AuditCreateInput;
}) => {
  const current = await findAppointmentForAdmin(input.appointmentId);

  if (!current) {
    throw new AppointmentNotFoundError("Appointment does not exist");
  }

  if (current.status === "completada" || current.status === "cancelada") {
    throw new AppointmentNotMutableError(
      "Completed or cancelled appointments cannot be rescheduled"
    );
  }

  const therapyType = input.therapyType ?? current.therapyType;
  const modality = input.modality ?? current.modality;
  const durationMinutes = therapyDurationMinutes(therapyType);
  const scheduledAt = input.scheduledAt;
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const isManualException = !isRegularAppointmentSchedule(
    scheduledAt,
    durationMinutes
  );

  if (isManualException && !input.manualExceptionConfirmed) {
    throw new ManualExceptionConfirmationRequiredError(
      "Confirma explícitamente la excepción manual para reagendar fuera del horario regular"
    );
  }

  await assertTherapistAvailability({
    therapistId: current.therapistId,
    scheduledAt,
    endsAt,
    excludeAppointmentId: current.id
  });

  const appointment = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.appointment.update({
      where: { id: current.id },
      data: {
        scheduledAt,
        endsAt,
        therapyType,
        durationMinutes,
        modality,
        isManualException,
        status: "programada"
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            whatsappPhone: true,
            birthdate: true
          }
        },
        therapist: {
          select: {
            id: true,
            isActive: true,
            user: { select: { fullName: true } }
          }
        }
      }
    });
    // Realign the prior-day reminders to the new date within the same
    // transaction so moving an appointment does not leave stale windows.
    await transaction.appointmentReminder.updateMany({
      where: {
        appointmentId: current.id,
        reminderType: { in: ["recordatorio_24h", "pago_pendiente"] }
      },
      data: {
        scheduledAt: previousDayReminderAt(scheduledAt),
        status: "pendiente",
        attemptsCount: 0,
        sentAt: null,
        providerMessageId: null,
        lastError: null
      }
    });
    const originalMetadata = input.audit.metadata;
    const metadata =
      originalMetadata &&
      typeof originalMetadata === "object" &&
      !Array.isArray(originalMetadata)
        ? originalMetadata
        : {};
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      action: isManualException
        ? "appointment_rescheduled_manual_exception"
        : input.audit.action,
      metadata: isManualException
        ? { ...metadata, manualExceptionConfirmed: true }
        : input.audit.metadata,
      entityId: updated.id
    });
    return updated;
  });

  return appointment;
};

export const confirmAppointmentWithAudit = async (input: {
  appointmentId: string;
  audit: AuditCreateInput;
}) => {
  const current = await findAppointmentForAdmin(input.appointmentId);

  if (!current) {
    throw new AppointmentNotFoundError("Appointment does not exist");
  }

  if (
    current.status === "confirmada" ||
    current.status === "completada" ||
    current.status === "cancelada"
  ) {
    throw new AppointmentNotMutableError(
      "Only scheduled appointments can be confirmed"
    );
  }

  const confirmedWithReminders = await prisma.$transaction(
    async (transaction) => {
      const confirmed = await transaction.appointment.update({
        where: { id: current.id },
        data: { status: "confirmada" },
        include: {
          patient: {
            select: {
              id: true,
              fullName: true,
              whatsappPhone: true,
              birthdate: true
            }
          },
          therapist: {
            select: {
              id: true,
              isActive: true,
              user: { select: { fullName: true } }
            }
          }
        }
      });
      // Reservar las confirmaciones anticipadas dentro de la misma transacción
      // para que el estado confirmada no quede sin su recordatorio.
      const confirmationReminders = await ensureConfirmationReminders(
        confirmed,
        transaction
      );
      await createAuditLogInTransaction(transaction, {
        ...input.audit,
        entityId: confirmed.id
      });
      return { appointment: confirmed, confirmationReminders };
    }
  );

  // Despacho best-effort tras el commit: si el envío falla, la cita ya quedó
  // confirmada y el estado de recordatorios registra el error.
  try {
    await dispatchAppointmentConfirmation({
      appointment: confirmedWithReminders.appointment,
      patient: confirmedWithReminders.appointment.patient,
      gateway: whatsappGateway,
      confirmationReminders: confirmedWithReminders.confirmationReminders
    });
  } catch {
    // El envío de confirmación es una grieta no crítica para la mutación.
  }

  return confirmedWithReminders.appointment;
};

export const cancelAppointmentWithAudit = async (input: {
  appointmentId: string;
  reason: string;
  audit: AuditCreateInput;
}) => {
  const current = await findAppointmentForAdmin(input.appointmentId);

  if (!current) {
    throw new AppointmentNotFoundError("Appointment does not exist");
  }

  if (current.status === "completada" || current.status === "cancelada") {
    throw new AppointmentNotMutableError(
      "Completed or cancelled appointments cannot be cancelled"
    );
  }

  const cancelledAt = new Date();
  const cancellationNotice = cancellationNoticeFor(
    current.scheduledAt,
    cancelledAt
  );

  const appointment = await prisma.$transaction(async (transaction) => {
    const cancelled = await transaction.appointment.update({
      where: { id: current.id },
      data: {
        status: "cancelada",
        cancelReason: input.reason,
        cancelledAt,
        cancellationNotice
      },
      include: {
        patient: {
          select: {
            id: true,
            fullName: true,
            whatsappPhone: true,
            birthdate: true
          }
        },
        therapist: {
          select: {
            id: true,
            isActive: true,
            user: { select: { fullName: true } }
          }
        }
      }
    });
    await scheduleCancellationNotice(cancelled.id, transaction);
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      entityId: cancelled.id
    });
    return cancelled;
  });

  return appointment;
};
