import assert from "node:assert/strict";
import test from "node:test";

import {
  processIncomingPaymentProof,
  processIncomingWhatsAppMessage
} from "../../src/modules/chatbot/chatbot.service.js";
import { genericGreetingResponse } from "../../src/modules/chatbot/response-templates.js";

test("a durable replay of a text message re-materializes the outbox without duplicating audit or reservation", async () => {
  let auditRuns = 0;
  let outboundMessages: string[] = [];

  const baseDependencies = {
    updateConversation: async () => ({}) as never,
    audit: async () => {
      auditRuns += 1;
    },
    createWhatsAppAppointment: async () => {
      throw new Error("should not be called for a generic response");
    },
    cancelAppointmentWithAudit: async () => {
      throw new Error("should not be called");
    },
    findVerifiedCancellableAppointment: async () => {
      throw new Error("should not be called");
    },
    saveOutboundMessage: async () => ({}) as never,
    sendAppointmentConfirmation: async () => {}
  };

  const conversation = {
    id: "conversation-1",
    currentIntent: "unknown",
    patientId: null,
    whatsappPhone: "5215550000000",
    lastMessageAt: new Date("2026-12-07T10:00:00.000Z")
  };

  const firstRun = await processIncomingWhatsAppMessage(
    {
      id: "wamid.replay-1",
      from: "5215550000000",
      text: "Buenos días",
      receivedAt: new Date("2026-12-07T10:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.s" }) },
      queueOutboundMessage: async (message) => {
        outboundMessages.push(message.text);
      }
    },
    {
      ...baseDependencies,
      saveIncomingMessage: async () => conversation as never,
      findConversationByIncomingMessage: async () => conversation as never
    }
  );

  assert.equal(firstRun, undefined);
  assert.equal(auditRuns, 0, "no audit for unknown intent");
  assert.deepEqual(outboundMessages, [genericGreetingResponse]);

  // Second run: saveIncomingMessage returns null (already persisted).
  outboundMessages = [];
  await processIncomingWhatsAppMessage(
    {
      id: "wamid.replay-1",
      from: "5215550000000",
      text: "Buenos días",
      receivedAt: new Date("2026-12-07T10:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.s" }) },
      queueOutboundMessage: async (message) => {
        outboundMessages.push(message.text);
      }
    },
    {
      ...baseDependencies,
      saveIncomingMessage: async () => null,
      findConversationByIncomingMessage: async () => conversation as never
    }
  );

  assert.equal(auditRuns, 0, "no audit on replay");
  assert.deepEqual(
    outboundMessages,
    [genericGreetingResponse],
    "outbox re-materialized on replay"
  );
});

test("a durable replay of a payment proof re-materializes the admin notice without duplicating the proof or its audit", async () => {
  const proofRuns = 0;
  let auditRuns = 0;
  let outboundMessages: string[] = [];

  const conversation = {
    id: "conversation-proof",
    currentIntent: "unknown",
    patientId: null,
    whatsappPhone: "5215550000001",
    lastMessageAt: new Date("2026-12-07T11:00:00.000Z")
  };

  const proof = {
    whatsappMessageId: "wamid.proof-1",
    mediaId: "media-1",
    mediaType: "image" as const,
    receivedAt: new Date("2026-12-07T11:00:00.000Z"),
    audit: {
      actorChannel: "whatsapp" as const,
      action: "payment_proof_received" as const,
      entityType: "payment_proof" as const,
      result: "success" as const,
      metadata: { mediaType: "image" as const }
    }
  };

  const baseDependencies = {
    updateConversation: async () => ({}) as never,
    audit: async () => {
      auditRuns += 1;
    }
  };

  // First run: proof is new.
  await processIncomingPaymentProof(
    {
      id: "wamid.proof-1",
      from: "5215550000001",
      mediaId: "media-1",
      mediaType: "image",
      receivedAt: new Date("2026-12-07T11:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.n" }) },
      queueOutboundMessage: async (message) => {
        outboundMessages.push(message.text);
      }
    },
    {
      ...baseDependencies,
      recordIncomingPaymentProof: async () =>
        ({
          id: "proof-1",
          ...proof
        }) as never,
      findPaymentProofByWhatsappMessageId: async () => null as never,
      saveIncomingMessage: async () => conversation as never,
      findConversationByIncomingMessage: async () => conversation as never
    }
  );

  assert.equal(proofRuns, 0);
  assert.equal(auditRuns, 1, "one review audit on first run");
  assert.equal(outboundMessages.length, 1);
  assert.match(outboundMessages[0], /comprobante de pago/i);

  // Second run: proof already persisted.
  outboundMessages = [];
  auditRuns = 0;
  await processIncomingPaymentProof(
    {
      id: "wamid.proof-1",
      from: "5215550000001",
      mediaId: "media-1",
      mediaType: "image",
      receivedAt: new Date("2026-12-07T11:00:00.000Z")
    },
    {
      gateway: { sendText: async () => ({ messageId: "wamid.n" }) },
      queueOutboundMessage: async (message) => {
        outboundMessages.push(message.text);
      }
    },
    {
      ...baseDependencies,
      recordIncomingPaymentProof: async () => null,
      findPaymentProofByWhatsappMessageId: async () =>
        ({ id: "proof-1" }) as never,
      saveIncomingMessage: async () => null,
      findConversationByIncomingMessage: async () => conversation as never
    }
  );

  assert.equal(auditRuns, 0, "no duplicate audit on replay");
  assert.equal(
    outboundMessages.length,
    1,
    "admin notice re-materialized on replay"
  );
  assert.match(outboundMessages[0], /comprobante de pago/i);
});
