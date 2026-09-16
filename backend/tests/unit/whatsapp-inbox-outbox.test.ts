import assert from "node:assert/strict";
import test from "node:test";

import { processIncomingWhatsAppInbox } from "../../src/jobs/process-whatsapp-inbox.job.js";

test("a failed WhatsApp response retries its outbox without reprocessing the inbox event", async () => {
  let incomingProcessed = false;
  let outgoing: {
    id: string;
    processingToken: string;
    attemptsCount: number;
    whatsappPhone: string;
    contentText: string;
    conversationId: string;
    intent: "book";
    status: "pendiente" | "fallido";
  } | null = null;
  let bookingRuns = 0;
  let auditRuns = 0;
  let outboxWrites = 0;
  let sends = 0;
  let savedMessages = 0;

  const dependencies = {
    claimIncoming: async () =>
      incomingProcessed
        ? ([] as never)
        : ([
            {
              id: "incoming-1",
              processingToken: "incoming-token",
              waMessageId: "wamid.booking-1",
              kind: "message",
              whatsappPhone: "5215550000000",
              receivedAt: new Date("2026-12-06T12:00:00.000Z"),
              payload: { text: "Reservar" },
              attemptsCount: 0
            }
          ] as never),
    markIncomingProcessed: async () => {
      incomingProcessed = true;
      return { count: 1 } as never;
    },
    markIncomingFailed: async () => ({ count: 1 }) as never,
    processMessage: async (_message: never, context: never) => {
      bookingRuns += 1;
      auditRuns += 1;
      await context.queueOutboundMessage({
        to: "5215550000000",
        text: "Su reserva fue registrada.",
        conversationId: "conversation-1",
        intent: "book"
      });
    },
    enqueueOutgoing: async (input: never) => {
      outboxWrites += 1;
      if (!outgoing) {
        outgoing = {
          id: "outgoing-1",
          processingToken: "outgoing-token",
          attemptsCount: 0,
          whatsappPhone: input.message.to,
          contentText: input.message.text,
          conversationId: input.message.conversationId,
          intent: "book",
          status: "pendiente"
        };
      }
      return {} as never;
    },
    claimOutgoing: async () => {
      if (!outgoing) {
        return [] as never;
      }
      const claimed = { ...outgoing, processingToken: "outgoing-token" };
      outgoing.status = "fallido";
      return [claimed] as never;
    },
    markOutgoingSent: async () => {
      outgoing = null;
      return { count: 1 } as never;
    },
    markOutgoingFailed: async () => ({ count: 1 }) as never,
    saveOutboundMessage: async () => {
      savedMessages += 1;
      return {} as never;
    },
    gateway: {
      sendText: async () => {
        sends += 1;
        if (sends === 1) {
          throw new Error("temporary Meta failure");
        }
        return { messageId: "wamid.response-1" };
      }
    }
  };

  await processIncomingWhatsAppInbox(dependencies);
  await processIncomingWhatsAppInbox(dependencies);

  assert.equal(bookingRuns, 1);
  assert.equal(auditRuns, 1);
  assert.equal(outboxWrites, 1);
  assert.equal(sends, 2);
  assert.equal(savedMessages, 1);
});
