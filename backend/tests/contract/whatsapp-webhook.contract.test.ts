import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { extractIncomingPaymentProofs } from "../../src/modules/chatbot/chatbot.controller.js";

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

const webhookSignature = (body: string) =>
  `sha256=${createHmac("sha256", env.META_APP_SECRET).update(body).digest("hex")}`;

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

test("POST WhatsApp webhook requires a valid Meta signature", async () => {
  await withServer(async (baseUrl) => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const response = await fetch(`${baseUrl}/api/v1/webhooks/whatsapp`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body
    });

    assert.equal(response.status, 403);
    assert.equal(
      ((await response.json()) as { code: string }).code,
      "webhook_signature_invalid"
    );
  });
});

test("POST WhatsApp webhook accepts a valid signed Meta envelope", async () => {
  await withServer(async (baseUrl) => {
    const body = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const response = await fetch(`${baseUrl}/api/v1/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": webhookSignature(body)
      },
      body
    });

    assert.equal(response.status, 202);
  });
});

test("POST WhatsApp webhook rejects an altered payload", async () => {
  await withServer(async (baseUrl) => {
    const signedBody = JSON.stringify({ object: "whatsapp_business_account", entry: [] });
    const alteredBody = JSON.stringify({ object: "whatsapp_business_account", entry: [{}] });
    const response = await fetch(`${baseUrl}/api/v1/webhooks/whatsapp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-hub-signature-256": webhookSignature(signedBody)
      },
      body: alteredBody
    });

    assert.equal(response.status, 403);
  });
});

test("WhatsApp webhook extracts image and document payment proofs", () => {
  const proofs = extractIncomingPaymentProofs({
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  id: "proof-image-1",
                  from: "5215500000000",
                  timestamp: "1780000000",
                  type: "image",
                  image: { id: "media-image-1" }
                },
                {
                  id: "proof-document-1",
                  from: "5215500000000",
                  timestamp: "1780000001",
                  type: "document",
                  document: { id: "media-document-1" }
                }
              ]
            }
          }
        ]
      }
    ]
  });

  assert.deepEqual(
    proofs.map((proof) => [proof.id, proof.mediaId, proof.mediaType]),
    [
      ["proof-image-1", "media-image-1", "image"],
      ["proof-document-1", "media-document-1", "document"]
    ]
  );
});
