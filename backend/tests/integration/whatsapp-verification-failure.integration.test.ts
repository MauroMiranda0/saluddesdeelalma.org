import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

import { processIncomingWhatsAppMessage } from "../../src/modules/chatbot/chatbot.service.js";
import { verifyPatientIdentity } from "../../src/modules/chatbot/identity-verification.service.js";
import {
  containsIdentityAnswer,
  identityVerificationSummary,
  sanitizeIncomingWhatsAppContent
} from "../../src/modules/chatbot/message-sanitizer.js";
import { statusVerificationFailedResponse } from "../../src/modules/chatbot/response-templates.js";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = join(testsDirectory, "..", "..");
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
  entityType: string;
  entityId?: string;
  result: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
};

type DeniedFlow = {
  text: string;
  audits: AuditInput[];
  outboundText: string;
};

const runDeniedStatusQuery = async (
  input: Omit<DeniedFlow, "audits" | "outboundText"> & {
    denialReason: "identity_mismatch" | "phone_not_registered";
  }
): Promise<DeniedFlow> => {
  const audits: AuditInput[] = [];
  let outboundText = "";

  await processIncomingWhatsAppMessage(
    {
      id: `wamid.denied-${input.denialReason}`,
      from: "5215550000000",
      text: input.text,
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.outbound" }) },
      ipAddress: "203.0.113.10",
      userAgent: "WhatsApp/2.0"
    },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "payment_status" }) as never,
      findConversationByIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "payment_status" }) as never,
      updateConversation: async () => ({}) as never,
      saveOutboundMessage: async (saved) => {
        outboundText = saved.contentText;
        return {} as never;
      },
      // The status handler must never be reached on a denied query, so this
      // dependency fails loudly if the service queries data before verifying.
      findNextActiveAppointmentForPatient: async () => {
        throw new Error(
          "appointment data must not be read before verification"
        );
      },
      verifyPatientIdentity: async () =>
        ({ status: "denied", reason: input.denialReason }) as never,
      audit: async (recorded) => {
        audits.push(recorded as AuditInput);
      }
    }
  );

  return { text: input.text, audits, outboundText };
};

test("a status query without a matching identity discloses nothing and is audited", async () => {
  const { audits, outboundText } = await runDeniedStatusQuery({
    text: "Nombre: Otra Persona; nacimiento: 1990-01-15",
    denialReason: "identity_mismatch"
  });

  assert.equal(outboundText, statusVerificationFailedResponse);
  // FR-024: no appointment or payment detail may leak on a denied query.
  assert.doesNotMatch(outboundText, /2026|septiembre|presencial|en línea/i);
  assert.doesNotMatch(outboundText, /anticipo|saldo|l[ií]quidado/i);
  assert.match(outboundText, /psic[oó]loga/i);
  assert.match(outboundText, /no pudimos confirmar/i);

  const denial = audits.find(
    (entry) => entry.action === "sensitive_status_query_denied"
  );
  assert.ok(denial, "the denied query must be audited");
  assert.equal(denial.result, "failure");
  assert.equal(denial.actorChannel, "whatsapp");
  assert.equal(denial.metadata.reason, "identity_mismatch");
  assert.equal(denial.ipAddress, "203.0.113.10");
  assert.equal(denial.userAgent, "WhatsApp/2.0");
});

test("an unregistered number is answered identically to a mismatched identity", async () => {
  const mismatch = await runDeniedStatusQuery({
    text: "Nombre: Otra Persona; nacimiento: 1990-01-15",
    denialReason: "identity_mismatch"
  });
  const unregistered = await runDeniedStatusQuery({
    text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
    denialReason: "phone_not_registered"
  });

  // A different answer would let an unauthenticated caller learn whether a
  // number belongs to a patient, so both denials must read the same.
  assert.equal(unregistered.outboundText, mismatch.outboundText);
  assert.equal(
    unregistered.audits.find(
      (entry) => entry.action === "sensitive_status_query_denied"
    )?.metadata.reason,
    "phone_not_registered"
  );
});

test("identity verification failures are audited with presence flags and no personal data", async () => {
  const audits: AuditInput[] = [];

  const result = await verifyPatientIdentity({
    whatsappPhone: "5215550000000",
    fullName: "Otra Persona",
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
    },
    ipAddress: "203.0.113.10",
    userAgent: "WhatsApp/2.0"
  });

  assert.equal(result.status, "denied");
  const failure = audits[0];
  assert.equal(failure.action, "identity_verification_failed");
  assert.equal(failure.result, "failure");
  assert.deepEqual(failure.metadata, {
    hasFullName: true,
    hasBirthdate: true,
    reason: "identity_mismatch"
  });

  // The audit trail must not become a second copy of the patient record.
  const serialized = JSON.stringify(failure);
  assert.doesNotMatch(serialized, /1990-01-15/);
  assert.doesNotMatch(serialized, /Otra Persona/);
});

test("the identity answer is reduced to an administrative summary before storage", () => {
  const answer = "Nombre: Ana Pérez; nacimiento: 1990-01-15";

  assert.equal(containsIdentityAnswer(answer), true);
  assert.equal(
    sanitizeIncomingWhatsAppContent(answer),
    identityVerificationSummary
  );
  assert.doesNotMatch(identityVerificationSummary, /1990-01-15|Ana Pérez/);

  // A booking request that only mentions a name keeps its full text.
  assert.equal(
    sanitizeIncomingWhatsAppContent("Quiero agendar una cita para Ana Pérez"),
    "Quiero agendar una cita para Ana Pérez"
  );
});

test("a booking or cancellation payload is not mistaken for an identity answer", () => {
  const bookingPayload =
    "Quiero agendar. Nombre: Ana Pérez; nacimiento: 1990-01-15; cita: 2026-09-14 17:00; modalidad: presencial; tipo: individual";

  // The reservation payload carries the same fields as an identity answer, and
  // its stored text is what makes the booking auditable, so it must survive.
  for (const intent of ["book", "cancel"] as const) {
    assert.equal(
      sanitizeIncomingWhatsAppContent(bookingPayload, intent),
      bookingPayload
    );
  }
  assert.equal(
    sanitizeIncomingWhatsAppContent(
      "Nombre: Ana Pérez; nacimiento: 1990-01-15"
    ),
    identityVerificationSummary
  );
});

test("the identity answer is not stored verbatim in the conversation history", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  const migration = await readFile(initialMigration, "utf8");
  await database.exec(`
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL AS $$
      SELECT '00000000-0000-0000-0000-000000000009'::uuid;
    $$;
  `);
  await database.exec(
    migration.replace(
      /CREATE EXTENSION IF NOT EXISTS "pgcrypto";\r?\n\r?\n/,
      ""
    )
  );
  await database.exec(`
    INSERT INTO "chat_conversations" (
      "id", "whatsapp_phone", "verification_status", "last_message_at"
    ) VALUES (
      '00000000-0000-0000-0000-000000000007',
      '5215550000000',
      'failed',
      '2026-09-10T12:00:00.000Z'
    );
    INSERT INTO "chat_messages" (
      "id", "conversation_id", "wa_message_id", "direction", "sender_kind",
      "content_mode", "content_text"
    ) VALUES (
      '00000000-0000-0000-0000-000000000008',
      '00000000-0000-0000-0000-000000000007',
      'wamid.denied-identity_mismatch',
      'inbound',
      'patient',
      'admin_summary',
      '${identityVerificationSummary}'
    );
    INSERT INTO "audit_logs" (
      "id", "actor_channel", "action", "entity_type", "result", "metadata"
    ) VALUES (
      '00000000-0000-0000-0000-000000000009',
      'whatsapp',
      'sensitive_status_query_denied',
      'chat_conversation',
      'failure',
      '{"reason":"identity_mismatch","intent":"payment_status"}'::jsonb
    );
  `);

  const persisted = await database.query(`
    SELECT
      "chat_messages"."content_text" AS "content_text",
      "chat_conversations"."verification_status" AS "verification_status",
      "audit_logs"."action" AS "audit_action"
    FROM "chat_messages"
    JOIN "chat_conversations"
      ON "chat_conversations"."id" = "chat_messages"."conversation_id"
    JOIN "audit_logs" ON "audit_logs"."action" = 'sensitive_status_query_denied'
    WHERE "chat_messages"."wa_message_id" = 'wamid.denied-identity_mismatch';
  `);

  assert.deepEqual(persisted.rows, [
    {
      content_text: identityVerificationSummary,
      verification_status: "failed",
      audit_action: "sensitive_status_query_denied"
    }
  ]);
});
