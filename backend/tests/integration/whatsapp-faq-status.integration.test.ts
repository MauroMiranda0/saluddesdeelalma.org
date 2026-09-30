import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import { paymentStatusOf } from "../../src/modules/appointments/appointments.service.js";
import type { PaymentSignal } from "../../src/modules/appointments/appointments.service.js";
import { classifyIntent } from "../../src/modules/chatbot/chatbot.intents.js";
import { processIncomingWhatsAppMessage } from "../../src/modules/chatbot/chatbot.service.js";
import {
  CONSULTORIO_FACTS,
  matchesFaqCategory
} from "../../src/modules/chatbot/faq.catalog.js";
import { verifyPatientIdentity } from "../../src/modules/chatbot/identity-verification.service.js";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = join(testsDirectory, "..", "..");
const landingCopy = join(backendDirectory, "..", "docs", "copy-landing.md");
const initialMigration = join(
  backendDirectory,
  "prisma",
  "migrations",
  "20260904000000_initial",
  "migration.sql"
);

type AuditInput = {
  actorChannel: string;
  action: string;
  entityId?: string;
  result: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

const gateway = { sendText: async () => ({ messageId: "wamid.outbound" }) };

const nextAppointment = {
  id: "00000000-0000-0000-0000-000000000004",
  scheduledAt: new Date("2026-09-14T23:00:00.000Z"),
  therapyType: "individual" as const,
  durationMinutes: 60,
  modality: "presencial" as const,
  status: "confirmada" as const,
  payments: [
    {
      paymentType: "anticipo" as const,
      status: "validado" as const
    }
  ]
};

const askStatus = async (input: {
  text: string;
  currentIntent?: string;
  verified?: boolean;
  payments?: typeof nextAppointment.payments | null;
}) => {
  const audits: AuditInput[] = [];
  let outboundText = "";
  const updatedConversations: Record<string, unknown>[] = [];

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.status-query",
      from: "5215550000000",
      text: input.text,
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    {
      gateway,
      ipAddress: "203.0.113.10",
      userAgent: "WhatsApp/2.0"
    },
    {
      saveIncomingMessage: async () =>
        ({
          id: "conversation-1",
          currentIntent: input.currentIntent ?? "payment_status"
        }) as never,
      findConversationByIncomingMessage: async () =>
        ({
          id: "conversation-1",
          currentIntent: input.currentIntent ?? "payment_status"
        }) as never,
      updateConversation: async (_conversationId, update) => {
        updatedConversations.push(update as unknown as Record<string, unknown>);
        return {} as never;
      },
      saveOutboundMessage: async (saved) => {
        outboundText = saved.contentText;
        return {} as never;
      },
      findNextActiveAppointmentForPatient: async () =>
        (input.verified === false || input.payments === null
          ? null
          : {
              ...nextAppointment,
              payments: input.payments ?? nextAppointment.payments
            }) as never,
      verifyPatientIdentity: async () =>
        (input.verified === false
          ? { status: "denied", reason: "identity_mismatch" }
          : {
              status: "verified",
              patient: {
                id: "00000000-0000-0000-0000-000000000002",
                fullName: "Ana Pérez",
                whatsappPhone: "5215550000000",
                assignedTherapistId: null
              }
            }) as never,
      audit: async (recorded) => {
        audits.push(recorded as AuditInput);
      }
    }
  );

  return { audits, outboundText, updatedConversations };
};

const askFaq = async (text: string) => {
  let outboundText = "";
  let updatedIntent = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.faq-query",
      from: "5215550000000",
      text,
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    { gateway },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "unknown" }) as never,
      updateConversation: async (_conversationId, update) => {
        updatedIntent = update.intent;
        return {} as never;
      },
      saveOutboundMessage: async (saved) => {
        outboundText = saved.contentText;
        return {} as never;
      },
      audit: async () => {}
    }
  );

  return { outboundText, updatedIntent };
};

test("the consultory facts match the public landing copy", async () => {
  const copy = await readFile(landingCopy, "utf8");

  for (const fact of Object.values(CONSULTORIO_FACTS)) {
    assert.ok(
      copy.includes(fact),
      `"${fact}" must stay in sync with docs/copy-landing.md`
    );
  }
});

test("each FAQ category answers with the official consultory information", async () => {
  const cases: [string, RegExp][] = [
    ["¿Cuál es el horario de atención?", new RegExp(CONSULTORIO_FACTS.hours)],
    [
      "¿Dónde están ubicados?",
      new RegExp(
        CONSULTORIO_FACTS.address
          .split(",")[0]
          .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      )
    ],
    ["¿Qué modalidades manejan?", /en línea o presencial/i],
    ["¿Qué formas de pago aceptan?", /transferencia y efectivo/i]
  ];

  for (const [question, expected] of cases) {
    const { outboundText, updatedIntent } = await askFaq(question);
    assert.match(outboundText, expected);
    assert.equal(updatedIntent, "faq");
  }
});

test("an FAQ question never exposes or requires a patient identity", async () => {
  const { outboundText } = await askFaq("¿Qué formas de pago aceptan?");

  assert.doesNotMatch(outboundText, /nombre y fecha de nacimiento/i);
  assert.doesNotMatch(outboundText, /1990-01-15/);
});

test("a status query asks for verification before disclosing anything", async () => {
  const { outboundText, updatedConversations } = await askStatus({
    text: "¿Cuál es el estado de mi cita?",
    currentIntent: "payment_status"
  });

  assert.match(outboundText, /Nombre:/);
  assert.match(outboundText, /nacimiento:/);
  assert.doesNotMatch(outboundText, /23 de septiembre|septiembre|presencial/i);
  assert.equal(updatedConversations[0]?.verificationStatus, "pending");
});

test("a verified patient receives the next appointment and its payment state", async () => {
  // The identity answer classifies as unknown on its own, so the pending
  // payment_status request is resumed from the conversation.
  const { outboundText, updatedConversations } = await askStatus({
    text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
    currentIntent: "payment_status"
  });

  // US5/AC2: date, time, modality and status of the next appointment.
  assert.match(outboundText, /confirmada/);
  assert.match(outboundText, /presencial/);
  assert.match(outboundText, /14 de septiembre/i);
  assert.match(outboundText, /individual/);
  // US5/AC3: the pending balance is reported without any amount.
  assert.match(outboundText, /anticipo registrado/i);
  assert.match(outboundText, /pendiente de liquidar/i);
  assert.doesNotMatch(outboundText, /\$\s*\d/);

  assert.equal(updatedConversations[0]?.verificationStatus, "verified");
  assert.equal(
    updatedConversations[0]?.patientId,
    "00000000-0000-0000-0000-000000000002"
  );
});

test("a successful verification is audited", async () => {
  const audits: AuditInput[] = [];

  const result = await verifyPatientIdentity({
    whatsappPhone: "5215550000000",
    fullName: "Ana Pérez",
    birthdate: "1990-01-15",
    findPatient: async () => ({
      id: "00000000-0000-0000-0000-000000000002",
      fullName: "Ana Pérez",
      whatsappPhone: "5215550000000",
      assignedTherapistId: null,
      birthdate: new Date("1990-01-15T00:00:00.000Z")
    }),
    audit: async (recorded) => {
      audits.push(recorded as AuditInput);
    }
  });

  assert.equal(result.status, "verified");
  const success = audits[0];
  assert.equal(success.action, "identity_verification_succeeded");
  assert.equal(success.result, "success");
  assert.equal(success.entityId, "00000000-0000-0000-0000-000000000002");
  // FR-025: presence flags only, never the name or the birthdate.
  assert.deepEqual(success.metadata, {
    hasFullName: true,
    hasBirthdate: true,
    patientId: "00000000-0000-0000-0000-000000000002"
  });
  assert.doesNotMatch(JSON.stringify(success), /1990-01-15/);
});

test("a verified patient without an appointment is told so without inventing data", async () => {
  const { outboundText } = await askStatus({
    text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
    verified: true,
    payments: null,
    currentIntent: "payment_status"
  });

  assert.match(outboundText, /no tenemos registrada una cita pr[oó]xima/i);
  assert.match(outboundText, /psic[oó]loga/i);
});

test("the payment state reported matches the panel's own paymentStatusOf", async () => {
  const cases: [PaymentSignal[], string, RegExp][] = [
    [
      [{ paymentType: "completo", status: "validado" }],
      "completado",
      /no tiene saldo pendiente/i
    ],
    [
      [{ paymentType: "anticipo", status: "validado" }],
      "anticipo",
      /anticipo registrado/i
    ],
    [
      [{ paymentType: "anticipo", status: "pendiente_validacion" }],
      "pendiente",
      /no tenemos un pago registrado/i
    ]
  ];

  for (const [payments, expectedLabel, expectedText] of cases) {
    assert.equal(
      paymentStatusOf(payments),
      expectedLabel,
      "the panel and the chatbot must agree on the payment state"
    );
    const { outboundText } = await askStatus({
      text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
      verified: true,
      currentIntent: "payment_status",
      payments
    });
    assert.match(outboundText, expectedText);
  }
});

test("booking, cancellation and clinical flows keep their classification", () => {
  assert.equal(classifyIntent("Quiero agendar una cita"), "book");
  assert.equal(classifyIntent("quiero agendar mi cita"), "book");
  assert.equal(classifyIntent("quiero una cita de pareja"), "book");
  // A booking payload carries field labels such as "modalidad: presencial";
  // they must not be read as a question about the offered modalities.
  assert.equal(
    classifyIntent(
      "Quiero agendar. Nombre: Ana Pérez; nacimiento: 1990-01-15; cita: 2026-09-14 17:00; modalidad: presencial; tipo: individual"
    ),
    "book"
  );
  assert.equal(classifyIntent("Quiero cancelar mi cita"), "cancel");
  assert.equal(
    classifyIntent("Me siento muy mal y quiero una cita"),
    "handoff"
  );
  assert.equal(
    classifyIntent("¿Tienen disponibilidad el jueves?"),
    "availability"
  );
});

test("an FAQ category is matched for every documented question", () => {
  assert.equal(
    matchesFaqCategory("¿Cuál es el horario?")?.category,
    "horarios"
  );
  assert.equal(
    matchesFaqCategory("¿Dónde están ubicados?")?.category,
    "ubicacion"
  );
  assert.equal(
    matchesFaqCategory("¿Qué modalidades manejan?")?.category,
    "modalidades"
  );
  assert.equal(
    matchesFaqCategory("¿Cómo hago un pago?")?.category,
    "formas_pago"
  );
  assert.equal(matchesFaqCategory("quiero agendar una cita"), null);
});

test("the verified status query persists its audit trail in the database", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  const migration = await readFile(initialMigration, "utf8");
  await database.exec(`
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL AS $$
      SELECT '00000000-0000-0000-0000-00000000000b'::uuid;
    $$;
  `);
  await database.exec(
    migration.replace(
      /CREATE EXTENSION IF NOT EXISTS "pgcrypto";\r?\n\r?\n/,
      ""
    )
  );
  await database.exec(`
    INSERT INTO "patients" ("id", "full_name", "whatsapp_phone", "birthdate")
    VALUES (
      '00000000-0000-0000-0000-00000000000a',
      'Ana Pérez',
      '5215550000000',
      '1990-01-15'
    );
    INSERT INTO "chat_conversations" (
      "id", "patient_id", "whatsapp_phone", "current_intent",
      "verification_status", "last_verified_at", "last_message_at"
    ) VALUES (
      '00000000-0000-0000-0000-00000000000b',
      '00000000-0000-0000-0000-00000000000a',
      '5215550000000',
      'payment_status',
      'verified',
      '2026-09-10T12:00:00.000Z',
      '2026-09-10T12:00:00.000Z'
    );
    INSERT INTO "audit_logs" (
      "id", "actor_channel", "action", "entity_type", "entity_id", "result", "metadata"
    ) VALUES (
      '00000000-0000-0000-0000-00000000000c',
      'whatsapp',
      'identity_verification_succeeded',
      'chat_conversation',
      '00000000-0000-0000-0000-00000000000a',
      'success',
      '{"hasFullName":true,"hasBirthdate":true}'::jsonb
    );
  `);

  const persisted = await database.query(`
    SELECT
      "chat_conversations"."current_intent" AS "current_intent",
      "chat_conversations"."verification_status" AS "verification_status",
      "audit_logs"."action" AS "audit_action"
    FROM "chat_conversations"
    JOIN "audit_logs" ON "audit_logs"."entity_id" = "chat_conversations"."patient_id"
    WHERE "chat_conversations"."whatsapp_phone" = '5215550000000';
  `);

  assert.deepEqual(persisted.rows, [
    {
      current_intent: "payment_status",
      verification_status: "verified",
      audit_action: "identity_verification_succeeded"
    }
  ]);
});
