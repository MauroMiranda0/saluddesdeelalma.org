import { randomUUID } from "node:crypto";

import { env } from "../../config/env";
import { logger } from "../../lib/logger";

export type WhatsAppSendResult =
  | { messageId: string }
  | { status: "disabled" };

export type WhatsAppGateway = {
  sendText(input: { to: string; text: string }): Promise<WhatsAppSendResult>;
};

type WhatsAppApiResponse = {
  messages?: Array<{ id?: string }>;
};

type WhatsAppGatewayDependencies = {
  outboundEnabled: boolean;
  accessToken: string | undefined;
  phoneNumberId: string | undefined;
  nodeEnv: "development" | "test" | "production";
  fetch: typeof fetch;
};

const defaultDependencies = (): WhatsAppGatewayDependencies => ({
  outboundEnabled: env.WHATSAPP_OUTBOUND_ENABLED,
  accessToken: env.WHATSAPP_ACCESS_TOKEN,
  phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
  nodeEnv: env.NODE_ENV,
  fetch
});

export const isWhatsAppOutboundDisabled = (
  result: WhatsAppSendResult
): result is { status: "disabled" } =>
  "status" in result && result.status === "disabled";

export const createWhatsAppGateway = (
  overrides: Partial<WhatsAppGatewayDependencies> = {}
): WhatsAppGateway => {
  const dependencies = { ...defaultDependencies(), ...overrides };

  return {
    async sendText({ to, text }) {
      if (!dependencies.outboundEnabled) {
        logger.warn(
          { event: "whatsapp_outbound_disabled" },
          "WhatsApp outbound is disabled; message was not sent"
        );
        return { status: "disabled" };
      }

      if (!dependencies.accessToken || !dependencies.phoneNumberId) {
        if (dependencies.nodeEnv === "production") {
          throw new Error("WhatsApp credentials are required in production");
        }

        return { messageId: `local-${randomUUID()}` };
      }

      const response = await dependencies.fetch(
        `https://graph.facebook.com/v22.0/${dependencies.phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${dependencies.accessToken}`,
            "content-type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "text",
            text: { body: text }
          })
        }
      );

      if (!response.ok) {
        throw new Error(`WhatsApp send failed with status ${response.status}`);
      }

      const payload = (await response.json()) as WhatsAppApiResponse;
      const messageId = payload.messages?.[0]?.id;

      if (!messageId) {
        throw new Error("WhatsApp send response did not include a message id");
      }

      return { messageId };
    }
  };
};

export const whatsappGateway = createWhatsAppGateway();
