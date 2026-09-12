import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";

const withServer = async (run: (baseUrl: string) => Promise<void>) => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("GET WhatsApp webhook returns Meta's challenge for the configured token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(env.WHATSAPP_VERIFY_TOKEN)}&hub.challenge=challenge-123`
    );

    assert.equal(response.status, 200);
    assert.equal(await response.text(), "challenge-123");
  });
});

test("GET WhatsApp webhook rejects an invalid verification token", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=invalid&hub.challenge=challenge-123`
    );

    assert.equal(response.status, 403);
    const body = (await response.json()) as {
      code: string;
      message: string;
      requestId: string;
    };
    assert.equal(body.code, "webhook_verification_failed");
    assert.equal(body.message, "Webhook verification failed");
    assert.equal(typeof body.requestId, "string");
  });
});

test("POST WhatsApp webhook accepts a valid Meta envelope asynchronously", async () => {
  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/v1/webhooks/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ object: "whatsapp_business_account", entry: [] })
    });

    assert.equal(response.status, 202);
  });
});
