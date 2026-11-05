import assert from "node:assert/strict";
import test from "node:test";

import { createWhatsAppGateway } from "../../src/integrations/whatsapp/whatsapp.gateway.js";

test("disabled WhatsApp outbound never calls HTTP, even with valid credentials", async () => {
  let httpCalls = 0;
  const gateway = createWhatsAppGateway({
    outboundEnabled: false,
    accessToken: "valid-access-token",
    phoneNumberId: "123456789",
    fetch: async () => {
      httpCalls += 1;
      return new Response();
    }
  });

  const result = await gateway.sendText({
    to: "5215550000000",
    text: "Synthetic test message"
  });

  assert.deepEqual(result, { status: "disabled" });
  assert.equal(httpCalls, 0);
});

test("enabled WhatsApp outbound preserves the Meta HTTP request", async () => {
  let request: { url: string; init?: RequestInit } | undefined;
  const gateway = createWhatsAppGateway({
    outboundEnabled: true,
    accessToken: "valid-access-token",
    phoneNumberId: "123456789",
    fetch: async (input, init) => {
      request = { url: String(input), init };
      return new Response(
        JSON.stringify({ messages: [{ id: "wamid.synthetic" }] }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }
  });

  const result = await gateway.sendText({
    to: "5215550000000",
    text: "Synthetic test message"
  });

  assert.deepEqual(result, { messageId: "wamid.synthetic" });
  assert.equal(
    request?.url,
    "https://graph.facebook.com/v22.0/123456789/messages"
  );
  assert.equal(request?.init?.method, "POST");
});
