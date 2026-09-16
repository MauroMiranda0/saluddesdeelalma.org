import {
  whatsappGateway,
  type WhatsAppGateway
} from "../integrations/whatsapp/whatsapp.gateway";
import { logger } from "../lib/logger";
import { saveOutboundMessage } from "../modules/chatbot/chat-messages.repository";
import {
  processIncomingPaymentProof,
  processIncomingWhatsAppMessage
} from "../modules/chatbot/chatbot.service";
import {
  claimDueIncomingWhatsAppEvents,
  claimDueOutgoingWhatsAppEvents,
  enqueueOutgoingWhatsAppEvent,
  markIncomingWhatsAppEventFailed,
  markIncomingWhatsAppEventProcessed,
  markOutgoingWhatsAppEventFailed,
  markOutgoingWhatsAppEventSent
} from "../modules/chatbot/whatsapp-inbox.repository";

const INTERVAL_MS = 30_000;

const messagePayload = (
  payload: unknown
): { text: string; ipAddress?: string; userAgent?: string } | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as {
    text?: unknown;
    ipAddress?: unknown;
    userAgent?: unknown;
  };
  return typeof value.text === "string"
    ? {
        text: value.text,
        ipAddress:
          typeof value.ipAddress === "string" ? value.ipAddress : undefined,
        userAgent:
          typeof value.userAgent === "string" ? value.userAgent : undefined
      }
    : null;
};

const paymentProofPayload = (
  payload: unknown
): {
  mediaId: string;
  mediaType: "image" | "document";
  ipAddress?: string;
  userAgent?: string;
} | null => {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = payload as {
    mediaId?: unknown;
    mediaType?: unknown;
    ipAddress?: unknown;
    userAgent?: unknown;
  };
  return typeof value.mediaId === "string" &&
    (value.mediaType === "image" || value.mediaType === "document")
    ? {
        mediaId: value.mediaId,
        mediaType: value.mediaType,
        ipAddress:
          typeof value.ipAddress === "string" ? value.ipAddress : undefined,
        userAgent:
          typeof value.userAgent === "string" ? value.userAgent : undefined
      }
    : null;
};

type InboxWorkerDependencies = {
  gateway: WhatsAppGateway;
  claimIncoming: typeof claimDueIncomingWhatsAppEvents;
  markIncomingProcessed: typeof markIncomingWhatsAppEventProcessed;
  markIncomingFailed: typeof markIncomingWhatsAppEventFailed;
  processMessage: typeof processIncomingWhatsAppMessage;
  processPaymentProof: typeof processIncomingPaymentProof;
  enqueueOutgoing: typeof enqueueOutgoingWhatsAppEvent;
  claimOutgoing: typeof claimDueOutgoingWhatsAppEvents;
  markOutgoingSent: typeof markOutgoingWhatsAppEventSent;
  markOutgoingFailed: typeof markOutgoingWhatsAppEventFailed;
  saveOutboundMessage: typeof saveOutboundMessage;
};

const defaultDependencies: InboxWorkerDependencies = {
  gateway: whatsappGateway,
  claimIncoming: claimDueIncomingWhatsAppEvents,
  markIncomingProcessed: markIncomingWhatsAppEventProcessed,
  markIncomingFailed: markIncomingWhatsAppEventFailed,
  processMessage: processIncomingWhatsAppMessage,
  processPaymentProof: processIncomingPaymentProof,
  enqueueOutgoing: enqueueOutgoingWhatsAppEvent,
  claimOutgoing: claimDueOutgoingWhatsAppEvents,
  markOutgoingSent: markOutgoingWhatsAppEventSent,
  markOutgoingFailed: markOutgoingWhatsAppEventFailed,
  saveOutboundMessage
};

const isOutboundIntent = (
  value: string | null
): value is "availability" | "book" | "cancel" | "handoff" | "unknown" =>
  value === "availability" ||
  value === "book" ||
  value === "cancel" ||
  value === "handoff" ||
  value === "unknown";

export const processIncomingWhatsAppInbox = async (
  overrides: Partial<InboxWorkerDependencies> = {}
) => {
  const dependencies = { ...defaultDependencies, ...overrides };
  const incomingEvents = await dependencies.claimIncoming();

  for (const event of incomingEvents) {
    try {
      let sequence = 0;
      const queueOutboundMessage = (
        message: Parameters<typeof enqueueOutgoingWhatsAppEvent>[0]["message"]
      ) =>
        dependencies.enqueueOutgoing({
          incomingEventId: event.id,
          sequence: sequence++,
          message
        });

      if (event.kind === "message") {
        const payload = messagePayload(event.payload);
        if (!payload) {
          throw new Error("Invalid persisted WhatsApp message payload");
        }
        await dependencies.processMessage(
          {
            id: event.waMessageId,
            from: event.whatsappPhone,
            text: payload.text,
            receivedAt: event.receivedAt
          },
          {
            gateway: dependencies.gateway,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            queueOutboundMessage
          }
        );
      } else {
        const payload = paymentProofPayload(event.payload);
        if (!payload) {
          throw new Error("Invalid persisted WhatsApp payment proof payload");
        }
        await dependencies.processPaymentProof(
          {
            id: event.waMessageId,
            from: event.whatsappPhone,
            mediaId: payload.mediaId,
            mediaType: payload.mediaType,
            receivedAt: event.receivedAt
          },
          {
            gateway: dependencies.gateway,
            ipAddress: payload.ipAddress,
            userAgent: payload.userAgent,
            queueOutboundMessage
          }
        );
      }

      await dependencies.markIncomingProcessed(event);
    } catch (error) {
      await dependencies.markIncomingFailed({ ...event, error });
      logger.error(
        { error, waMessageId: event.waMessageId },
        "WhatsApp inbox event processing failed"
      );
    }
  }

  const outgoingEvents = await dependencies.claimOutgoing();
  for (const event of outgoingEvents) {
    try {
      const sent = await dependencies.gateway.sendText({
        to: event.whatsappPhone,
        text: event.contentText
      });
      const marked = await dependencies.markOutgoingSent({
        id: event.id,
        processingToken: event.processingToken,
        providerMessageId: sent.messageId
      });
      if (
        marked.count === 1 &&
        event.conversationId &&
        isOutboundIntent(event.intent)
      ) {
        await dependencies.saveOutboundMessage({
          conversationId: event.conversationId,
          waMessageId: sent.messageId,
          contentText: event.contentText,
          intent: event.intent
        });
      }
    } catch (error) {
      await dependencies.markOutgoingFailed({ ...event, error });
      logger.error(
        { error, outgoingEventId: event.id },
        "WhatsApp outgoing inbox event delivery failed"
      );
    }
  }

  return incomingEvents.length;
};

export const startWhatsAppInboxWorker = () => {
  let running = false;

  const run = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await processIncomingWhatsAppInbox();
    } catch (error) {
      logger.error({ error }, "WhatsApp inbox dispatch failed");
    } finally {
      running = false;
    }
  };

  void run();
  return setInterval(() => void run(), INTERVAL_MS);
};
