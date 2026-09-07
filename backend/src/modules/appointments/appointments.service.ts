import { Prisma } from "@prisma/client";

import type { CreateAppointmentInput } from "../../lib/validators/appointment";
import { findOrCreatePatient } from "../patients/patients.service";
import {
  createAppointmentRecord,
  findActiveAppointmentsFrom
} from "./appointments.repository";

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

export const assertWhatsAppAppointmentSchedule = (scheduledAt: Date) => {
  const { weekday, hour, minute } = localTimeParts(scheduledAt);

  if (
    weekday === "Sat" ||
    weekday === "Sun" ||
    hour < 9 ||
    hour > 21 ||
    minute !== 0
  ) {
    throw new AppointmentScheduleError(
      "WhatsApp appointments are available Monday through Friday from 09:00 to 21:00 on the hour"
    );
  }
};

const isActiveAppointmentConflict = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === "P2002";

export const createWhatsAppAppointment = async (
  input: CreateAppointmentInput
) => {
  const scheduledAt = new Date(input.scheduledAt);
  assertWhatsAppAppointmentSchedule(scheduledAt);

  const patient = await findOrCreatePatient(input.patient);

  try {
    const appointment = await createAppointmentRecord({
      patientId: patient.id,
      scheduledAt,
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

export const findNextAvailableSlots = async (count = 3) => {
  const now = new Date();
  const occupied = new Set(
    (await findActiveAppointmentsFrom(now)).map((appointment) =>
      appointment.scheduledAt.toISOString()
    )
  );
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

    for (let hour = 9; hour <= 21 && slots.length < count; hour += 1) {
      const slot = new Date(
        Date.UTC(
          dayAtUtc.getUTCFullYear(),
          dayAtUtc.getUTCMonth(),
          dayAtUtc.getUTCDate(),
          hour + 6
        )
      );

      if (slot > now && !occupied.has(slot.toISOString())) {
        slots.push(slot);
      }
    }
  }

  return slots;
};
