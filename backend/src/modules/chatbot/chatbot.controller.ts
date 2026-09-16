import type { RequestHandler } from "express";

import { env } from "../../config/env";
import { whatsappWebhookSchema } from "../../lib/validators/chatbot";
import { AppError } from "../../middleware/error-handler";
import {
  type IncomingPaymentProof,
  type IncomingWhatsAppMessage
} from "./chatbot.service";
import {
  enqueueIncomingWhatsAppEvents,
  type IncomingWhatsAppInboxEvent
} from "./whatsapp-inbox.repository";

type MetaMessage = {
  id?: unknown;
  from?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
  image?: { id?: unknown };
  document?: { id?: unknown };
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : undefined;

export const extractIncomingWhatsAppMessages = (
  payload: unknown
): IncomingWhatsAppMessage[] => {
  const parsed = whatsappWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError(
      400,
      "invalid_webhook_payload",
      "Invalid WhatsApp webhook payload"
    );
  }

  return parsed.data.entry.flatMap((entry) => {
    const changes = asRecord(entry)?.changes;

    if (!Array.isArray(changes)) {
      return [];
    }

    return changes.flatMap((change) => {
      const messages = asRecord(change)?.value;
      const items = asRecord(messages)?.messages;

      if (!Array.isArray(items)) {
        return [];
      }

      return items.flatMap((item) => {
        const message = item as MetaMessage;
        const body = message.text?.body;

        if (
          message.type !== "text" ||
          typeof message.id !== "string" ||
          typeof message.from !== "string" ||
          typeof body !== "string" ||
          !body.trim()
        ) {
          return [];
        }

        const timestamp =
          typeof message.timestamp === "string" &&
          /^\d+$/.test(message.timestamp)
            ? new Date(Number(message.timestamp) * 1000)
            : new Date();

        return [
          {
            id: message.id,
            from: message.from,
            text: body.trim(),
            receivedAt: Number.isNaN(timestamp.valueOf())
              ? new Date()
              : timestamp
          }
        ];
      });
    });
  });
};

export const extractIncomingPaymentProofs = (
  payload: unknown
): IncomingPaymentProof[] => {
  const parsed = whatsappWebhookSchema.safeParse(payload);

  if (!parsed.success) {
    throw new AppError(
      400,
      "invalid_webhook_payload",
      "Invalid WhatsApp webhook payload"
    );
  }

  return parsed.data.entry.flatMap((entry) => {
    const changes = asRecord(entry)?.changes;
    if (!Array.isArray(changes)) {
      return [];
    }

    return changes.flatMap((change) => {
      const items = asRecord(asRecord(change)?.value)?.messages;
      if (!Array.isArray(items)) {
        return [];
      }

      return items.flatMap((item) => {
        const message = item as MetaMessage;
        const mediaType: "image" | "document" | undefined =
          message.type === "image" || message.type === "document"
            ? message.type
            : undefined;
        const mediaId =
          mediaType === "image"
            ? message.image?.id
            : mediaType === "document"
              ? message.document?.id
              : undefined;
        if (
          typeof message.id !== "string" ||
          typeof message.from !== "string" ||
          !mediaType ||
          typeof mediaId !== "string"
        ) {
          return [];
        }
        const timestamp =
          typeof message.timestamp === "string" &&
          /^\d+$/.test(message.timestamp)
            ? new Date(Number(message.timestamp) * 1000)
            : new Date();
        return [
          {
            id: message.id,
            from: message.from,
            mediaId,
            mediaType,
            receivedAt: Number.isNaN(timestamp.valueOf())
              ? new Date()
              : timestamp
          }
        ];
      });
    });
  });
};

export const verifyWhatsAppWebhook: RequestHandler = (
  request,
  response,
  next
) => {
  const mode = request.query["hub.mode"];
  const token = request.query["hub.verify_token"];
  const challenge = request.query["hub.challenge"];

  if (
    mode !== "subscribe" ||
    token !== env.WHATSAPP_VERIFY_TOKEN ||
    typeof challenge !== "string"
  ) {
    next(
      new AppError(
        403,
        "webhook_verification_failed",
        "Webhook verification failed"
      )
    );
    return;
  }

  response.type("text/plain").status(200).send(challenge);
};

export const receiveWhatsAppWebhook: RequestHandler = async (
  request,
  response,
  next
) => {
  let messages: IncomingWhatsAppMessage[];
  let paymentProofs: IncomingPaymentProof[];

  try {
    messages = extractIncomingWhatsAppMessages(request.body);
    paymentProofs = extractIncomingPaymentProofs(request.body);
  } catch (error) {
    next(error);
    return;
  }

  const events: IncomingWhatsAppInboxEvent[] = [
    ...messages.map((message) => ({
      waMessageId: message.id,
      kind: "message" as const,
      whatsappPhone: message.from,
      receivedAt: message.receivedAt,
      payload: {
        text: message.text,
        ipAddress: request.ip,
        userAgent: request.header("user-agent") ?? undefined
      }
    })),
    ...paymentProofs.map((proof) => ({
      waMessageId: proof.id,
      kind: "payment_proof" as const,
      whatsappPhone: proof.from,
      receivedAt: proof.receivedAt,
      payload: {
        mediaId: proof.mediaId,
        mediaType: proof.mediaType,
        ipAddress: request.ip,
        userAgent: request.header("user-agent") ?? undefined
      }
    }))
  ];

  try {
    await enqueueIncomingWhatsAppEvents(events);
    response.status(202).send();
  } catch (error) {
    next(error);
  }
};
