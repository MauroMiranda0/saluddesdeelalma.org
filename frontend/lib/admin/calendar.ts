import type { AdminAppointmentEvent, Directory } from "./api";

export type CalendarEvent = {
  id: string;
  kind: "appointment" | "cumpleanios";
  startsAt: string;
  endsAt: string;
  title: string;
  subtitle?: string;
  meta?: string;
  appointment?: AdminAppointmentEvent;
  patientId?: string;
  patientName?: string;
};

export const dayKeyOf = (date: Date) => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

export const dateAtNoon = (year: number, month: number, day: number) => {
  return new Date(year, month, day, 12);
};

export const buildMonthGrid = (monthStart: Date) => {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const leading = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - leading);
  const days: Date[] = [];

  for (let index = 0; index < 42; index += 1) {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + index);
    days.push(day);
  }

  return days;
};

export const buildWeekDays = (weekStart: Date) => {
  const days: Date[] = [];

  for (let index = 0; index < 7; index += 1) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + index);
    days.push(day);
  }

  return days;
};

export const startOfWeek = (date: Date) => {
  const start = new Date(date);
  const offset = (date.getDay() + 6) % 7;

  start.setDate(date.getDate() - offset);
  start.setHours(0, 0, 0, 0);

  return start;
};

export const startOfDay = (date: Date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

export const formatTime = (iso: string) => {
  const date = new Date(iso);
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");

  return `${hour}:${minute}`;
};

export const formatDayLabel = (date: Date) => {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric"
  }).format(date);
};

export const formatFullDayLabel = (date: Date) => {
  return new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long"
  }).format(date);
};

export const formatMonthLabel = (date: Date) => {
  return new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric"
  }).format(date);
};

const timeWindowOverlaps = (startIso: string, endIso: string, day: Date) => {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();

  return start < dayEnd && end > dayStart;
};

export const appointmentsOverWindow = (
  appointments: AdminAppointmentEvent[],
  day: Date
) => {
  return appointments.filter((appointment) =>
    timeWindowOverlaps(appointment.scheduledAt, appointment.endsAt, day)
  );
};

export type BirthdayEvent = Omit<CalendarEvent, "kind"> & {
  kind: "cumpleanios";
};

export const birthdaysOverWindow = (
  directory: Directory,
  days: Date[]
): BirthdayEvent[] => {
  const windowKeys = new Set(days.map(dayKeyOf));
  const year = days[0]?.getFullYear() ?? new Date().getFullYear();
  const events: BirthdayEvent[] = [];

  for (const patient of directory.patients) {
    if (!patient.birthdate) {
      continue;
    }
    const [, month, day] = patient.birthdate.split("-").map(Number);

    if (!month || !day) {
      continue;
    }

    const birthday = new Date(year, month - 1, day, 12);

    if (!windowKeys.has(dayKeyOf(birthday))) {
      continue;
    }

    events.push({
      id: `cumpleaños-${patient.id}`,
      kind: "cumpleanios",
      startsAt: dateAtNoon(year, month - 1, day).toISOString(),
      endsAt: dateAtNoon(year, month - 1, day).toISOString(),
      title: patient.fullName,
      meta: "🎂",
      patientId: patient.id,
      patientName: patient.fullName
    });
  }

  return events;
};

export const eventsForWindow = (
  appointments: AdminAppointmentEvent[],
  directory: Directory,
  days: Date[]
): CalendarEvent[] => {
  const appointmentEvents = days.flatMap((day) =>
    appointmentsOverWindow(appointments, day).map((appointment) => ({
      id: appointment.id,
      kind: "appointment" as const,
      startsAt: appointment.scheduledAt,
      endsAt: appointment.endsAt,
      title: appointment.patientName,
      subtitle: appointment.therapistName ?? undefined,
      meta: appointment.modality === "online" ? "📹" : "📍",
      appointment
    }))
  );
  const birthdayEvents = birthdaysOverWindow(directory, days);

  return [...appointmentEvents, ...birthdayEvents];
};
