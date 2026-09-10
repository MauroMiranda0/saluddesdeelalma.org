import { randomUUID } from "node:crypto";

import { env } from "../../config/env";

export type WhatsAppGateway = {
  sendText(input: { to: string; text: string }): Promise<{ messageId: string }>;
};

type WhatsAppApiResponse = {
  messages?: Array<{ id?: string }>;
};

export const createWhatsAppGateway = (): WhatsAppGateway => ({
  async sendText({ to, text }) {
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      if (env.NODE_ENV === "production") {
        throw new Error("WhatsApp credentials are required in production");
      }

      return { messageId: `local-${randomUUID()}` };
    }

    const response = await fetch(
      `https://graph.facebook.com/v22.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
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
});

export const whatsappGateway = createWhatsAppGateway();
