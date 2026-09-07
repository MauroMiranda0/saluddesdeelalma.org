import type { RequestHandler } from "express";

import { env } from "../../config/env";
import { whatsappGateway } from "../../integrations/whatsapp/whatsapp.gateway";
import { logger } from "../../lib/logger";
import { whatsappWebhookSchema } from "../../lib/validators/chatbot";
import { AppError } from "../../middleware/error-handler";
import {
  processIncomingWhatsAppMessage,
  type IncomingWhatsAppMessage
} from "./chatbot.service";

type MetaMessage = {
  id?: unknown;
  from?: unknown;
  timestamp?: unknown;
  type?: unknown;
  text?: { body?: unknown };
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

export const receiveWhatsAppWebhook: RequestHandler = (
  request,
  response,
  next
) => {
  let messages: IncomingWhatsAppMessage[];

  try {
    messages = extractIncomingWhatsAppMessages(request.body);
  } catch (error) {
    next(error);
    return;
  }

  response.status(202).send();

  void Promise.all(
    messages.map((message) =>
      processIncomingWhatsAppMessage(message, {
        gateway: whatsappGateway,
        ipAddress: request.ip,
        userAgent: request.header("user-agent")
      })
    )
  ).catch((error: unknown) => {
    logger.error({ error }, "Failed to process WhatsApp webhook message");
  });
};
