import assert from "node:assert/strict";
import test from "node:test";

import {
  AppointmentScheduleError,
  assertWhatsAppAppointmentSchedule
} from "../../src/modules/appointments/appointments.service.js";
import { extractIncomingWhatsAppMessages } from "../../src/modules/chatbot/chatbot.controller.js";
import {
  classifyIntent,
  hasCompleteBookingDetails,
  parseBookingDetails
} from "../../src/modules/chatbot/chatbot.intents.js";

test("WhatsApp booking message produces complete booking details", () => {
  const details = parseBookingDetails(
    "Quiero agendar. Nombre: Ana Pérez; nacimiento: 1990-01-15; cita: 2026-09-14 17:00; modalidad: presencial"
  );

  assert.equal(classifyIntent("Quiero agendar una cita"), "book");
  assert.ok(hasCompleteBookingDetails(details));

  if (hasCompleteBookingDetails(details)) {
    assert.equal(details.fullName, "Ana Pérez");
    assert.equal(details.birthdate, "1990-01-15");
    assert.equal(details.scheduledAt, "2026-09-14T23:00:00.000Z");
    assert.equal(details.modality, "presencial");
  }
});

test("WhatsApp webhook extracts text messages and ignores delivery statuses", () => {
  const messages = extractIncomingWhatsAppMessages({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "wamid.test-message",
                  from: "5215550000000",
                  timestamp: "1789369200",
                  type: "text",
                  text: { body: "Quiero agendar una cita" }
                },
                {
                  id: "wamid.unsupported",
                  from: "5215550000000",
                  type: "image"
                }
              ],
              statuses: [{ id: "wamid.delivery-status" }]
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(
    messages.map(({ id, from, text }) => ({ id, from, text })),
    [
      {
        id: "wamid.test-message",
        from: "5215550000000",
        text: "Quiero agendar una cita"
      }
    ]
  );
});

test("clinical language is classified for handoff instead of booking", () => {
  assert.equal(
    classifyIntent("Tengo mucha ansiedad y necesito saber si es normal"),
    "handoff"
  );
});

test("WhatsApp booking only accepts regular Mexico City hourly slots", () => {
  assert.doesNotThrow(() =>
    assertWhatsAppAppointmentSchedule(new Date("2026-09-14T23:00:00.000Z"))
  );
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(new Date("2026-09-13T23:00:00.000Z")),
    AppointmentScheduleError
  );
});
