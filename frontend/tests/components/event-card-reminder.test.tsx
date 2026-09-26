import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { EventCard } from "../../components/admin/agenda/event-card";
import type {
  AdminAppointmentEvent,
  AppointmentReminder
} from "../../lib/admin/api";
import type { CalendarEvent } from "../../lib/admin/calendar";

const recordatorio = (
  status: AppointmentReminder["status"],
  attemptsCount: number,
  overrides: Partial<AppointmentReminder> = {}
): AppointmentReminder => ({
  reminderType: "recordatorio_24h",
  recipient: "paciente",
  status,
  attemptsCount,
  sentAt: null,
  ...overrides
});

const cita = (reminders: AppointmentReminder[]): AdminAppointmentEvent => ({
  id: "cita-recordatorio",
  scheduledAt: "2026-09-26T10:00:00.000Z",
  endsAt: "2026-09-26T11:00:00.000Z",
  therapyType: "individual",
  durationMinutes: 60,
  modality: "online",
  status: "programada",
  isManualException: false,
  locationLabel: null,
  meetingLink: null,
  cancelReason: null,
  cancelledAt: null,
  cancellationNotice: null,
  createdVia: "panel",
  paymentStatus: "pendiente",
  payments: [],
  reminders,
  patientId: "paciente-recordatorio",
  patientName: "Paciente con recordatorio",
  patientPhone: "5555555555",
  patientBirthdate: null,
  therapistId: "terapeuta-recordatorio",
  therapistName: "Jocelyn",
  therapistIsActive: true
});

const evento = (appointment: AdminAppointmentEvent): CalendarEvent => ({
  id: appointment.id,
  kind: "appointment",
  startsAt: appointment.scheduledAt,
  endsAt: appointment.endsAt,
  title: appointment.patientName,
  subtitle: appointment.therapistName ?? undefined,
  appointment
});

const markupDe = (
  appointment: AdminAppointmentEvent,
  variant: "month" | "week" | "day" = "day"
) =>
  renderToStaticMarkup(
    <EventCard event={evento(appointment)} variant={variant} />
  );

test("la tarjeta traduce los cinco estados del recordatorio", () => {
  const casos: Array<[AppointmentReminder["status"], string, number]> = [
    ["pendiente", "pendiente", 0],
    ["procesando", "en envío", 1],
    ["enviado", "enviado", 1],
    ["fallido", "fallido", 3],
    ["omitido", "omitido", 0]
  ];

  for (const [status, etiqueta, intentos] of casos) {
    const html = markupDe(cita([recordatorio(status, intentos)]));

    assert.match(
      html,
      new RegExp(`Recordatorio: ${etiqueta}\\s*·\\s*${intentos}/3`),
      `estado ${status}`
    );
  }
});

test("la tarjeta omite el recordatorio en la vista mes", () => {
  const html = markupDe(cita([recordatorio("enviado", 1)]), "month");

  assert.doesNotMatch(html, /Recordatorio:/);
});

test("la tarjeta muestra el recordatorio en la vista semana", () => {
  const html = markupDe(cita([recordatorio("enviado", 1)]), "week");

  assert.match(html, /Recordatorio: enviado/);
});

test("la tarjeta solo muestra el aviso dirigido a la paciente", () => {
  const html = markupDe(
    cita([recordatorio("pendiente", 0, { recipient: "grupo_psicologas" })])
  );

  assert.doesNotMatch(html, /Recordatorio:/);
});

test("la tarjeta no muestra otros tipos de recordatorio", () => {
  const tipos: AppointmentReminder["reminderType"][] = [
    "confirmacion",
    "cancelacion",
    "pago_pendiente",
    "pago_pendiente_post_cita"
  ];

  for (const reminderType of tipos) {
    const html = markupDe(
      cita([recordatorio("enviado", 1, { reminderType })]),
      "week"
    );

    assert.doesNotMatch(html, /Recordatorio:/, reminderType);
  }
});

test("la tarjeta no falla si la cita llega sin el campo recordatorios", () => {
  const citaIncompleta: Record<string, unknown> = { ...cita([]) };
  delete citaIncompleta.reminders;

  const html = markupDe(citaIncompleta as unknown as AdminAppointmentEvent);

  assert.match(html, /Paciente con recordatorio/);
  assert.doesNotMatch(html, /Recordatorio:/);
});
