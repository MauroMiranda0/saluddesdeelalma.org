import { Prisma } from "@prisma/client";

import { prisma } from "../../lib/prisma";
import type { CreateAppointmentInput } from "../../lib/validators/appointment";
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
  findActiveAppointmentsForTherapist
} from "./appointments.repository";
import { createPostCompletionPaymentReminder } from "../reminders/reminders.service";

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
