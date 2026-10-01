import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
const landingPage = join(backendDirectory, "..", "frontend", "app", "page.tsx");

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
  replayed?: boolean;
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
      // A durable retry is signalled the same way the real repository does it:
      // `saveIncomingMessage` returns null and the conversation is recovered
      // through `findConversationByIncomingMessage`.
      saveIncomingMessage: async () =>
        (input.replayed
          ? null
          : {
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

type PersistedIncoming = {
  contentText: string;
  intent: string;
  containsSensitiveClinicalContent: boolean;
  contentWasMinimized?: boolean;
};

/**
 * FR-025 is only meaningful if the text that reaches the persistence layer is
 * the minimised one. This helper captures the exact payload handed to
 * `saveIncomingMessage`, because the repository derives `content_mode` from it.
 */
const captureIncoming = async (
  text: string,
  currentIntent = "unknown"
): Promise<PersistedIncoming> => {
  const persisted: PersistedIncoming[] = [];

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.capture",
      from: "5215550000000",
      text,
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    { gateway },
    {
      saveIncomingMessage: async (saved) => {
        persisted.push(saved as unknown as PersistedIncoming);
        return { id: "conversation-1", currentIntent } as never;
      },
      updateConversation: async () => ({}) as never,
      saveOutboundMessage: async () => ({}) as never,
      audit: async () => {}
    }
  );

  assert.equal(persisted.length, 1);
  return persisted[0];
};

test("the consultory facts match the public landing copy", async () => {
  const copy = await readFile(landingCopy, "utf8");
  // The landing wraps the address across two JSX lines, which the browser
  // renders as a single space, so both sources are compared with whitespace
  // collapsed. Without this the guard could only ever see the first line.
  const page = (await readFile(landingPage, "utf8")).replace(/\s+/g, " ");

  // FR-022 and SC-010: the chatbot may only state official, current
  // information, so the catalog and the two public sources must not drift.
  for (const fact of Object.values(CONSULTORIO_FACTS)) {
    assert.ok(
      copy.includes(fact),
      `"${fact}" must stay in sync with docs/copy-landing.md`
    );
    assert.ok(
      page.includes(fact.replace(/\s+/g, " ")),
      `"${fact}" must stay in sync with frontend/app/page.tsx`
    );
  }

  // A bare `includes("50%")` would be satisfied by any percentage on the page,
  // so the advance policy is asserted as the phrase both sources actually use.
  for (const [name, source] of [
    ["docs/copy-landing.md", copy],
    ["frontend/app/page.tsx", page]
  ] as const) {
    assert.match(
      source,
      /anticipo del \*{0,2}50%/,
      `the advance policy must be stated as "anticipo del 50%" in ${name}`
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

  // US5/AC2: date, time, modality and status of the next appointment. The
  // instant is 2026-09-14T23:00:00Z, which is 17:00 in `America/Mexico_City`, so
  // the time, the weekday and the 12-hour format are asserted literally: a
  // timezone or `hour12` regression has to fail here.
  assert.match(outboundText, /confirmada/);
  assert.match(outboundText, /presencial/);
  assert.match(outboundText, /lunes, 14 de septiembre/i);
  assert.match(outboundText, /5:00\s*p\.?m\.?/i);
  assert.match(outboundText, /individual/);
  // US5/AC3: the pending balance is reported without any amount.
  assert.match(outboundText, /anticipo registrado/i);
  assert.match(outboundText, /pendiente de liquidar/i);
  assert.doesNotMatch(outboundText, /\$\s*\d/);
  // The UTC instant must never leak into a Mexican Spanish answer.
  assert.doesNotMatch(outboundText, /11:00|23:00/);

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

// FR-022 / SC-010: the public landing and `docs/copy-landing.md` both advertise
// these questions, so the catalog must answer each of them instead of letting
// them fall through to the booking prompt or to the generic greeting.
test("every question published on the landing page is answered as an FAQ", () => {
  const publicFaq = [
    "¿Cómo agendo una cita?",
    "¿Cuánto dura una sesión?",
    "¿Puedo elegir entre sesión en línea o presencial?",
    "¿Cómo puedo pagar?",
    "¿Mis datos están seguros?"
  ];

  for (const question of publicFaq) {
    assert.equal(
      classifyIntent(question),
      question === "¿Cómo agendo una cita?" ? "book" : "faq",
      `"${question}" must reach a handler that answers it`
    );
  }

  assert.equal(
    matchesFaqCategory("¿Cuánto dura una sesión?")?.category,
    "duracion"
  );
  assert.equal(
    matchesFaqCategory("¿Los recordatorios son automáticos?")?.category,
    "recordatorios"
  );
  assert.equal(
    matchesFaqCategory("¿Mis datos están seguros?")?.category,
    "privacidad"
  );
});

test("the duration answer states both session lengths", async () => {
  const { outboundText } = await askFaq("¿Cuánto dura una sesión?");

  assert.match(outboundText, /60 minutos/);
  assert.match(outboundText, /90 minutos/);
});

// T186: the landing publishes the cancellation policy, and that question used
// to be routed to the `cancel` flow, which demands identity before it does
// anything. FR-029 also forbids promising a late-cancellation charge, so the
// answer has to say there is none.
test("the cancellation policy is answered from the catalog and promises no charge", async () => {
  assert.equal(classifyIntent("¿Qué pasa si necesito cancelar?"), "faq");

  const { outboundText } = await askFaq("¿Qué pasa si necesito cancelar?");

  assert.match(outboundText, /24 horas/i);
  assert.match(outboundText, /No hay cargos/i);
  assert.doesNotMatch(
    outboundText,
    /costo adicional|podr[ií]a aplicar un cargo|multa|penalizaci[oó]n/i
  );
  // A policy question must not ask for identity, unlike a real cancellation.
  assert.doesNotMatch(outboundText, /Nombre:|nacimiento:/i);
});

test("an actual cancellation request still reaches the cancel intent", () => {
  // The policy pattern must not swallow the imperative, or the patient could
  // never cancel: T202 tracks the "ya no puedo ir" gap separately.
  for (const request of [
    "quiero cancelar mi cita",
    "cancelar",
    "necesito anular mi cita"
  ]) {
    assert.equal(
      classifyIntent(request),
      "cancel",
      `"${request}" must reach the cancellation flow`
    );
  }
});

test("the schedule answer keeps the Monday to Friday restriction of FR-002", async () => {
  const { outboundText } = await askFaq("¿A qué hora atienden?");

  assert.match(outboundText, /lunes a viernes/);
  assert.match(outboundText, new RegExp(CONSULTORIO_FACTS.hours));
});

// FR-025: the minimisation has to be observable in what the repository is asked
// to store, not only inside the pure sanitizer function.
test("clinical content reaches persistence as an administrative summary", async () => {
  const persisted = await captureIncoming(
    "He tenido ansiedad y no puedo más, quiero hacer daño"
  );

  assert.equal(
    persisted.contentText,
    "El paciente solicitó apoyo clínico; se derivó a la psicóloga."
  );
  assert.equal(persisted.containsSensitiveClinicalContent, true);
  assert.equal(persisted.contentWasMinimized, true);
  assert.doesNotMatch(persisted.contentText, /ansiedad|daño/i);
});

test("the identity confirmation is not stored verbatim", async () => {
  const identityAnswer = "Nombre: Ana Pérez; nacimiento: 1990-01-15";
  const persisted = await captureIncoming(identityAnswer);

  assert.notEqual(persisted.contentText, identityAnswer);
  assert.doesNotMatch(persisted.contentText, /Ana Pérez|1990-01-15/);
  assert.match(persisted.contentText, /confirmó nombre y fecha de nacimiento/i);
  // The identity answer carries no clinical content, so the repository must rely
  // on `contentWasMinimized` to store it as a summary.
  assert.equal(persisted.containsSensitiveClinicalContent, false);
  assert.equal(persisted.contentWasMinimized, true);
});

test("an ordinary question is stored verbatim and not flagged as minimised", async () => {
  const persisted = await captureIncoming("¿Cuál es el horario de atención?");

  assert.equal(persisted.contentText, "¿Cuál es el horario de atención?");
  assert.equal(persisted.containsSensitiveClinicalContent, false);
  assert.equal(persisted.contentWasMinimized, false);
});

// T191: the exported verifier must never be able to deny silently.
test("a verification attempt without both details is denied and audited", async () => {
  const audits: AuditInput[] = [];

  const result = await verifyPatientIdentity({
    whatsappPhone: "5215550000000",
    fullName: "Ana Pérez",
    audit: async (recorded) => {
      audits.push(recorded as AuditInput);
    }
  });

  assert.deepEqual(result, { status: "denied", reason: "details_missing" });
  assert.equal(audits.length, 1);
  assert.equal(audits[0]?.action, "identity_verification_failed");
  assert.equal(audits[0]?.result, "failure");
  assert.equal(audits[0]?.metadata.reason, "details_missing");
  assert.doesNotMatch(JSON.stringify(audits[0]), /Ana Pérez|1990-01-15/);
});

// T199: a partially supplied identity must be re-prompted, not treated as a
// denial nor as a verified patient.
test("a status answer missing the birthdate asks again instead of answering", async () => {
  const { outboundText, updatedConversations } = await askStatus({
    text: "Nombre: Ana Pérez",
    currentIntent: "payment_status"
  });

  assert.match(outboundText, /Nombre:/);
  assert.match(outboundText, /nacimiento:/);
  assert.doesNotMatch(outboundText, /confirmada|presencial|septiembre/i);
  assert.equal(updatedConversations[0]?.verificationStatus, "pending");
});

test("a status answer missing the name asks again", async () => {
  const { outboundText, updatedConversations } = await askStatus({
    text: "nacimiento: 1990-01-15",
    currentIntent: "payment_status"
  });

  assert.match(outboundText, /Nombre:/);
  assert.equal(updatedConversations[0]?.verificationStatus, "pending");
});

test("a denied status query is audited once across a durable retry", async () => {
  const first = await askStatus({
    text: "Nombre: Otra Persona; nacimiento: 1980-01-01",
    currentIntent: "payment_status",
    verified: false
  });
  const denials = first.audits.filter(
    (recorded) => recorded.action === "sensitive_status_query_denied"
  );

  // FR-026: the denial is auditable, and the record must not be duplicated by a
  // redelivery of the same `waMessageId`.
  assert.equal(denials.length, 1);
  assert.equal(denials[0]?.result, "failure");
  // The reason is auditable, but the supplied name and birthdate are not.
  assert.deepEqual(denials[0]?.metadata, {
    reason: "identity_mismatch",
    intent: "payment_status"
  });

  const retry = await askStatus({
    text: "Nombre: Otra Persona; nacimiento: 1980-01-01",
    currentIntent: "payment_status",
    verified: false,
    replayed: true
  });
  const retriedDenials = retry.audits.filter(
    (recorded) => recorded.action === "sensitive_status_query_denied"
  );

  assert.equal(
    retriedDenials.length,
    0,
    "a durable retry must not repeat the denial audit"
  );
  // The patient still has to receive the denial, even on the retry.
  assert.match(retry.outboundText, /No pudimos confirmar sus datos/i);
});

test("a scheduled appointment is reported as scheduled, never as confirmed", async () => {
  let outboundText = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.status-programada",
      from: "5215550000000",
      text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    { gateway, ipAddress: "203.0.113.10", userAgent: "WhatsApp/2.0" },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "payment_status" }) as never,
      updateConversation: async () => ({}) as never,
      saveOutboundMessage: async (saved) => {
        outboundText = saved.contentText;
        return {} as never;
      },
      // The same appointment as the AC2 test, but still `programada`. A status
      // answer built from a hardcoded "confirmada" would lie about it.
      findNextActiveAppointmentForPatient: async () =>
        ({ ...nextAppointment, status: "programada" }) as never,
      verifyPatientIdentity: async () =>
        ({
          status: "verified",
          patient: {
            id: "00000000-0000-0000-0000-000000000002",
            fullName: "Ana Pérez",
            whatsappPhone: "5215550000000",
            assignedTherapistId: null
          }
        }) as never,
      audit: async () => {}
    }
  );

  assert.match(outboundText, /programada/i);
  assert.doesNotMatch(outboundText, /confirmada/i);
  // The date, time and modality are still reported.
  assert.match(outboundText, /lunes, 14 de septiembre/i);
  assert.match(outboundText, /5:00\s*p\.?m\.?/i);
});

test("a cancelled appointment is never reported as confirmed", async () => {
  let outboundText = "";

  await processIncomingWhatsAppMessage(
    {
      id: "wamid.status-cancelled",
      from: "5215550000000",
      text: "Nombre: Ana Pérez; nacimiento: 1990-01-15",
      receivedAt: new Date("2026-09-10T12:00:00.000Z")
    },
    { gateway, ipAddress: "203.0.113.10", userAgent: "WhatsApp/2.0" },
    {
      saveIncomingMessage: async () =>
        ({ id: "conversation-1", currentIntent: "payment_status" }) as never,
      updateConversation: async () => ({}) as never,
      saveOutboundMessage: async (saved) => {
        outboundText = saved.contentText;
        return {} as never;
      },
      // A `cancelada` appointment is not an active one, so the repository
      // returns nothing and the patient must be told so instead of receiving a
      // confirmed session.
      findNextActiveAppointmentForPatient: async () => null,
      verifyPatientIdentity: async () =>
        ({
          status: "verified",
          patient: {
            id: "00000000-0000-0000-0000-000000000002",
            fullName: "Ana Pérez",
            whatsappPhone: "5215550000000",
            assignedTherapistId: null
          }
        }) as never,
      audit: async () => {}
    }
  );

  assert.match(outboundText, /No tenemos registrada una cita pr[oó]xima/i);
  assert.doesNotMatch(outboundText, /confirmada|pendiente de liquidar/i);
});
