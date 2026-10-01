import assert from "node:assert/strict";
import test from "node:test";

import { processIncomingWhatsAppMessage } from "../../src/modules/chatbot/chatbot.service.js";
import { verifyPatientIdentity } from "../../src/modules/chatbot/identity-verification.service.js";
import {
  containsIdentityAnswer,
  identityVerificationSummary,
  sanitizeIncomingWhatsAppContent
} from "../../src/modules/chatbot/message-sanitizer.js";
import { statusVerificationFailedResponse } from "../../src/modules/chatbot/response-templates.js";

const gateway = { sendText: async () => ({ messageId: "wamid.outbound" }) };

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

// FR-026: the denial audit that accompanies a rejected status query must itself
// be leak-free, and must carry the same presence flags as the verification rows.
test("the denied status query audit carries no patient data", async () => {
  const audits: AuditInput[] = [];

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.denied-audit-metadata",
      from: "5215550000000",
      text: "Nombre: Otra Persona; nacimiento: 1980-02-02",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    { gateway, ipAddress: "203.0.113.10", userAgent: "WhatsApp/2.0" },
    {
      saveIncomingMessage: async () =>
        ({
          id: "conversation-1",
          currentIntent: "payment_status"
        }) as never,
      updateConversation: async () => ({}) as never,
      saveOutboundMessage: async () => ({}) as never,
      verifyPatientIdentity: async () =>
        ({ status: "denied", reason: "identity_mismatch" }) as never,
      audit: async (recorded) => {
        audits.push(recorded as AuditInput);
      }
    }
  );

  const denial = audits.find(
    (entry) => entry.action === "sensitive_status_query_denied"
  );
  assert.ok(denial, "the denial must be audited");
  assert.equal(denial.result, "failure");
  assert.equal(denial.metadata.reason, "identity_mismatch");
  assert.doesNotMatch(
    JSON.stringify(denial),
    /Otra Persona|1980-02-02|1990-01-15/
  );
});
