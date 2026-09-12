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
  createAppointmentRecord,
  findActiveAppointmentsForTherapist,
  findAppointmentForAdmin,
  listAppointmentsInRange
} from "./appointments.repository";
import {
  createPostCompletionPaymentReminder,
  scheduleAppointmentReminders,
  scheduleCancellationNotice
} from "../reminders/reminders.service";

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

export const assertWhatsAppAppointmentSchedule = (
  scheduledAt: Date,
  durationMinutes = 60
) => {
  const { weekday, hour, minute } = localTimeParts(scheduledAt);
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);
  const end = localTimeParts(endsAt);

  if (
    weekday === "Sat" ||
    weekday === "Sun" ||
    hour < 9 ||
    minute !== 0 ||
    end.weekday !== weekday ||
    end.hour > 21 ||
    (end.hour === 21 && end.minute !== 0)
  ) {
    throw new AppointmentScheduleError(
      "WhatsApp appointments must fit Monday through Friday from 09:00 to 21:00 in 60 or 90 minute blocks"
    );
  }
};

const isActiveAppointmentConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === "P2002" ||
    (error.code === "P2010" && error.meta?.code === "23P01"));

export const createWhatsAppAppointment = async (
  input: CreateAppointmentInput
) => {
  const scheduledAt = new Date(input.scheduledAt);
  const durationMinutes = therapyDurationMinutes(input.therapyType);
  assertWhatsAppAppointmentSchedule(scheduledAt, durationMinutes);

  const patient = await findOrCreatePatient(input.patient);
  const patientWithTherapist = await findPatientWithAssignedTherapist(
    patient.whatsappPhone
  );

  if (
    !patientWithTherapist?.assignedTherapistId ||
    !patientWithTherapist.assignedTherapist?.isActive
  ) {
    throw new TherapistAssignmentRequiredError(
      "An admin must assign an active therapist before booking this patient"
    );
  }
  const endsAt = new Date(scheduledAt.getTime() + durationMinutes * 60_000);

  try {
    const appointment = await createAppointmentRecord({
      patientId: patient.id,
      therapistId: patientWithTherapist.assignedTherapistId,
      scheduledAt,
      endsAt,
      therapyType: input.therapyType,
      durationMinutes,
      modality: input.modality,
      isManualException: false,
      locationLabel: input.locationLabel,
      meetingLink: input.meetingLink,
      createdVia: "whatsapp"
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

    for (let hour = 9; hour <= 20 && slots.length < count; hour += 1) {
      const slot = new Date(
        Date.UTC(
          dayAtUtc.getUTCFullYear(),
          dayAtUtc.getUTCMonth(),
          dayAtUtc.getUTCDate(),
          hour + 6
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

export const completeAppointmentWithAudit = (input: {
  appointmentId: string;
  audit: AuditCreateInput;
}) => {
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
  };
  payments?: PaymentSignal[];
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
  patientId: appointment.patient.id,
  patientName: appointment.patient.fullName,
  patientPhone: appointment.patient.whatsappPhone,
  patientBirthdate: appointment.patient.birthdate
    ? appointment.patient.birthdate.toISOString().slice(0, 10)
    : null,
  therapistId: appointment.therapist.id,
  therapistName: appointment.therapist.user?.fullName ?? null,
  therapistIsActive: appointment.therapist.isActive
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

  let appointment;

  try {
    appointment = await prisma.$transaction(async (transaction) => {
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
      await scheduleAppointmentReminders(created, transaction);
      await createAuditLogInTransaction(transaction, {
        ...input.audit,
        entityId: created.id
      });
      return created;
    });
  } catch (error) {
    if (isActiveAppointmentConflict(error)) {
      throw new AppointmentConflictError(
        "The requested appointment slot is unavailable"
      );
    }
    throw error;
  }

  return appointment;
};

export const rescheduleAppointmentWithAudit = async (input: {
  appointmentId: string;
  scheduledAt: Date;
  modality?: "online" | "presencial";
  therapyType?: "individual" | "pareja" | "familiar";
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
  let isManualException = current.isManualException;

  if (!isManualException) {
    try {
      assertWhatsAppAppointmentSchedule(scheduledAt, durationMinutes);
    } catch {
      // Moving outside regular hours from the panel is a manual exception.
      isManualException = true;
    }
  }

  const appointment = await prisma.$transaction(async (transaction) => {
    const updated = await transaction.appointment.update({
      where: { id: current.id },
      data: {
        scheduledAt,
        endsAt,
        therapyType,
        durationMinutes,
        modality,
        isManualException
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
    await createAuditLogInTransaction(transaction, {
      ...input.audit,
      entityId: updated.id
    });
    return updated;
  });

  return appointment;
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
