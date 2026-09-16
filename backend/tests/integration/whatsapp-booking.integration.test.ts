import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import {
  AppointmentScheduleError,
  assertWhatsAppAppointmentSchedule
} from "../../src/modules/appointments/appointments.service.js";
import { extractIncomingWhatsAppMessages } from "../../src/modules/chatbot/chatbot.controller.js";
import {
  classifyIntent,
  containsSensitiveClinicalContent,
  hasCompleteBookingDetails,
  isAutomationQuestion,
  matchesPatientIdentity,
  parseBookingDetails,
  parseCancellationDetails
} from "../../src/modules/chatbot/chatbot.intents.js";
import { automationDisclosureResponse } from "../../src/modules/chatbot/response-templates.js";
import {
  processIncomingWhatsAppMessage,
  sanitizeIncomingWhatsAppContent
} from "../../src/modules/chatbot/chatbot.service.js";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = join(testsDirectory, "..", "..");
const initialMigration = join(
  backendDirectory,
  "prisma",
  "migrations",
  "20260904000000_initial",
  "migration.sql"
);
const businessRulesMigration = join(
  backendDirectory,
  "prisma",
  "migrations",
  "20260907000000_business_rules",
  "migration.sql"
);

const applyInitialMigration = async (database: PGlite) => {
  const migration = await readFile(initialMigration, "utf8");

  await database.exec(`
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL AS $$
      SELECT '00000000-0000-0000-0000-000000000003'::uuid;
    $$;
  `);
  await database.exec(
    migration.replace(
      /CREATE EXTENSION IF NOT EXISTS "pgcrypto";\r?\n\r?\n/,
      ""
    )
  );
};

test("WhatsApp booking message produces complete booking details", () => {
  const details = parseBookingDetails(
    "Quiero agendar. Nombre: Ana Pérez; nacimiento: 1990-01-15; cita: 2026-09-14 17:00; modalidad: presencial; tipo: individual"
  );

  assert.equal(classifyIntent("Quiero agendar una cita"), "book");
  assert.ok(hasCompleteBookingDetails(details));

  if (hasCompleteBookingDetails(details)) {
    assert.equal(details.fullName, "Ana Pérez");
    assert.equal(details.birthdate, "1990-01-15");
    assert.equal(details.scheduledAt, "2026-09-14T23:00:00.000Z");
    assert.equal(details.modality, "presencial");
    assert.equal(details.therapyType, "individual");
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
  assert.equal(
    classifyIntent(
      "Me siento muy mal y quiero agendar una cita con la terapeuta"
    ),
    "handoff"
  );
});

test("automation questions are answered transparently and clinical content is minimized", () => {
  assert.equal(
    isAutomationQuestion("¿Estoy hablando con un sistema automatizado?"),
    true
  );
  assert.match(automationDisclosureResponse, /asistente digital/i);
  assert.equal(
    containsSensitiveClinicalContent(
      "Me siento muy mal y necesito hablar sobre violencia en mi relación"
    ),
    true
  );
  assert.equal(
    classifyIntent("Me siento muy mal y necesito hablar sobre violencia"),
    "handoff"
  );
  assert.equal(
    sanitizeIncomingWhatsAppContent(
      "Me siento muy mal y necesito hablar sobre violencia en mi relación"
    ),
    "El paciente solicitó apoyo clínico; se derivó a la psicóloga."
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
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-14T02:30:00.000Z"),
        90
      ),
    AppointmentScheduleError
  );
});

test("WhatsApp booking flow creates an appointment, confirmation, and audit record", async () => {
  let inboundContent = "";
  let appointmentPhone = "";
  let updatedPatientId = "";
  let auditAction = "";
  let confirmationAppointmentId = "";
  let confirmationConversationId = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.booking-flow",
      from: "5215550000000",
      text: "Quiero agendar. Nombre: Ana Pérez; nacimiento: 1990-01-15; cita: 2026-09-14 17:00; modalidad: presencial; tipo: individual",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    {
      gateway: {
        sendText: async () => ({ messageId: "wamid.outbound" })
      }
    },
    {
      saveIncomingMessage: async (input) => {
        inboundContent = input.contentText;
        return { id: "conversation-1", currentIntent: "unknown" } as never;
      },
      createWhatsAppAppointment: async (input) => {
        appointmentPhone = input.patient.whatsappPhone;
        auditAction = input.audit?.action ?? "";
        return {
          appointment: { id: "appointment-1" } as never,
          patient: { id: "patient-1" } as never
        };
      },
      updateConversation: async (_conversationId, input) => {
        updatedPatientId = input.patientId ?? "";
        return {} as never;
      },
      sendAppointmentConfirmation: async (input) => {
        confirmationAppointmentId = input.appointment.id;
        confirmationConversationId = input.conversationId;
      }
    }
  );

  assert.equal(inboundContent.includes("Ana Pérez"), true);
  assert.equal(appointmentPhone, "5215550000000");
  assert.equal(updatedPatientId, "patient-1");
  assert.equal(auditAction, "appointment_created");
  assert.equal(confirmationAppointmentId, "appointment-1");
  assert.equal(confirmationConversationId, "conversation-1");
});

test("WhatsApp booking persistence keeps the appointment, confirmation, and audit trail", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  await applyInitialMigration(database);
  await database.exec(`
    INSERT INTO "admin_users" ("id", "email", "password_hash", "full_name")
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@saluddesdeelalma.org',
      'legacy-password-hash',
      'Jocelyn Gutiérrez'
    );
    INSERT INTO "patients" ("id", "full_name", "whatsapp_phone", "birthdate")
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'Ana Pérez',
      '5215550000000',
      '1990-01-15'
    );
  `);
  await database.exec(await readFile(businessRulesMigration, "utf8"));
  await database.exec(`
    INSERT INTO "appointments" (
      "id", "patient_id", "scheduled_at", "modality", "created_via"
    ) VALUES (
      '00000000-0000-0000-0000-000000000004',
      '00000000-0000-0000-0000-000000000002',
      '2026-09-14T23:00:00.000Z',
      'presencial',
      'whatsapp'
    );
    INSERT INTO "appointment_reminders" (
      "id", "appointment_id", "reminder_type", "recipient", "scheduled_at", "status"
    ) VALUES (
      '00000000-0000-0000-0000-000000000005',
      '00000000-0000-0000-0000-000000000004',
      'confirmacion',
      'paciente',
      '2026-09-10T12:00:00.000Z',
      'enviado'
    );
    INSERT INTO "audit_logs" (
      "id", "actor_channel", "action", "entity_type", "entity_id", "result"
    ) VALUES (
      '00000000-0000-0000-0000-000000000006',
      'whatsapp',
      'appointment_created',
      'appointment',
      '00000000-0000-0000-0000-000000000004',
      'success'
    );
  `);

  const persisted = await database.query(`
    SELECT
      "appointments"."created_via",
      "appointment_reminders"."status" AS "confirmation_status",
      "audit_logs"."action" AS "audit_action"
    FROM "appointments"
    JOIN "appointment_reminders"
      ON "appointment_reminders"."appointment_id" = "appointments"."id"
    JOIN "audit_logs"
      ON "audit_logs"."entity_id" = "appointments"."id"
    WHERE "appointments"."id" = '00000000-0000-0000-0000-000000000004';
  `);

  assert.deepEqual(persisted.rows, [
    {
      created_via: "whatsapp",
      confirmation_status: "enviado",
      audit_action: "appointment_created"
    }
  ]);
});

test("cancellation intent is classified before booking and clinical content still wins", () => {
  assert.equal(classifyIntent("Quiero cancelar mi cita"), "cancel");
  assert.equal(classifyIntent("Necesito cancelarla por favor"), "cancel");
  assert.equal(
    classifyIntent("Me siento muy mal y quiero cancelar mi cita"),
    "handoff"
  );
});

test("cancellation details parse the patient name and birthdate and match identity", () => {
  const details = parseCancellationDetails(
    "Quiero cancelar. Nombre: Ana Pérez; nacimiento: 1990-01-15"
  );

  assert.deepEqual(details, {
    fullName: "Ana Pérez",
    birthdate: "1990-01-15"
  });
  assert.equal(
    matchesPatientIdentity(
      {
        fullName: "Ana Pérez",
        birthdate: new Date("1990-01-15T00:00:00.000Z")
      },
      "ana pérez",
      "1990-01-15"
    ),
    true
  );
  assert.equal(
    matchesPatientIdentity(
      {
        fullName: "Ana Pérez",
        birthdate: new Date("1990-01-15T00:00:00.000Z")
      },
      "Ana Pérez",
      "1991-01-15"
    ),
    false
  );
  assert.equal(
    matchesPatientIdentity(
      { fullName: "Ana Pérez", birthdate: null },
      "Ana Pérez",
      "1990-01-15"
    ),
    false
  );
});

test("WhatsApp cancellation flow verifies identity and confirms the cancelled appointment", async () => {
  let updatedIntent = "";
  let updatedPatientId = "";
  let outboundText = "";
  let cancelReason = "";
  let cancelAuditAction = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.cancel-flow",
      from: "5215550000000",
      text: "Quiero cancelar. Nombre: Ana Pérez; nacimiento: 1990-01-15",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.outbound" }) }
    },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "cancel" }) as never,
      updateConversation: async (_conversationId, input) => {
        updatedIntent = input.intent;
        updatedPatientId = input.patientId ?? "";
        return {} as never;
      },
      saveOutboundMessage: async (input) => {
        outboundText = input.contentText;
        return {} as never;
      },
      findVerifiedCancellableAppointment: async () =>
        ({
          status: "cancellable",
          patient: { id: "patient-1" },
          appointment: {
            id: "appointment-1",
            scheduledAt: new Date("2026-09-14T23:00:00.000Z")
          }
        }) as never,
      cancelAppointmentWithAudit: async (input) => {
        cancelReason = input.reason;
        cancelAuditAction = input.audit.action;
        return {
          id: "appointment-1",
          patient: { id: "patient-1", fullName: "Ana Pérez" },
          scheduledAt: new Date("2026-09-14T23:00:00.000Z"),
          therapyType: "individual",
          durationMinutes: 60,
          modality: "presencial"
        } as never;
      },
      audit: async () => {}
    }
  );

  assert.equal(updatedIntent, "cancel");
  assert.equal(updatedPatientId, "patient-1");
  assert.equal(cancelAuditAction, "appointment_cancelled");
  assert.match(cancelReason, /verificación/i);
  assert.match(outboundText, /quedó cancelada/i);
  assert.match(outboundText, /reagendar/i);
});

test("WhatsApp cancellation is denied without matching identity and the attempt is audited", async () => {
  let deniedAuditAction = "";
  let outboundText = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.cancel-denied",
      from: "5215550000000",
      text: "Quiero cancelar. Nombre: Otra Persona; nacimiento: 1990-01-15",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.outbound" }) }
    },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "cancel" }) as never,
      updateConversation: async () => ({}) as never,
      findVerifiedCancellableAppointment: async () =>
        ({ status: "denied" }) as never,
      audit: async (input) => {
        deniedAuditAction = input.action;
      },
      saveOutboundMessage: async (input) => {
        outboundText = input.contentText;
        return {} as never;
      }
    }
  );

  assert.equal(deniedAuditAction, "appointment_cancellation_denied");
  assert.match(outboundText, /no pudimos confirmar/i);
});
