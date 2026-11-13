import { Router } from "express";
import { createHmac, timingSafeEqual } from "node:crypto";

import { env } from "../../config/env";
import { AppError } from "../../middleware/error-handler";
import {
  receiveWhatsAppWebhook,
  verifyWhatsAppWebhook
} from "./chatbot.controller";

export const chatbotRoutes = Router();

chatbotRoutes.get("/whatsapp", verifyWhatsAppWebhook);
chatbotRoutes.post(
  "/whatsapp",
  (request, response, next) => {
    const secret = env.WHATSAPP_APP_SECRET;
    if (
      !secret ||
      secret.includes("replace-with-") ||
      secret.startsWith("development-")
    ) {
      next(
        new AppError(
          503,
          "webhook_not_configured",
          "WhatsApp webhook is not configured"
        )
      );
      return;
    }

    const signature = request.header("x-hub-signature-256");
    const rawBody: unknown = response.locals.whatsappRawBody;
    if (
      !signature ||
      !/^sha256=[a-f0-9]{64}$/.test(signature) ||
      !Buffer.isBuffer(rawBody)
    ) {
      next(
        new AppError(
          403,
          "invalid_webhook_signature",
          "Invalid WhatsApp webhook signature"
        )
      );
      return;
    }

    const expected = createHmac("sha256", secret).update(rawBody).digest();
    const provided = Buffer.from(signature.slice("sha256=".length), "hex");
    if (!timingSafeEqual(expected, provided)) {
      next(
        new AppError(
          403,
          "invalid_webhook_signature",
          "Invalid WhatsApp webhook signature"
        )
      );
      return;
    }

    next();
  },
  receiveWhatsAppWebhook
);
