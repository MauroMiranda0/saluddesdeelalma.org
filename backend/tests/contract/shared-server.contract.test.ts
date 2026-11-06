import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import test from "node:test";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";

const require = createRequire(import.meta.url);
const { createRequestHandler } = require("../../../server.cjs");

test("shared server routes frontend, health and signed webhook through one listener", async () => {
  let frontendRequests = 0;
  const backend = createApp({ checkDatabase: async () => 1 });
  const frontend = (
    _request: unknown,
    response: import("node:http").ServerResponse
  ) => {
    frontendRequests += 1;
    response.end("frontend");
  };
  const server = createServer(
    createRequestHandler(backend, frontend, () => {
      throw new Error("Unexpected frontend error");
    })
  );
  server.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;

  try {
    const home = await fetch(`${base}/`);
    assert.equal(await home.text(), "frontend");
    const live = await fetch(`${base}/health`);
    assert.equal(live.status, 200);
    const ready = await fetch(`${base}/api/v1/health`, {
      headers: { "x-request-id": "shared-health-test" }
    });
    assert.equal(ready.status, 200);
    assert.equal(ready.headers.get("x-request-id"), "shared-health-test");
    assert.equal(
      ((await ready.json()) as { database: boolean }).database,
      true
    );

    const body = JSON.stringify({
      object: "whatsapp_business_account",
      entry: []
    });
    const signature = createHmac("sha256", env.META_APP_SECRET)
      .update(body)
      .digest("hex");
    const webhook = (signatureHeader: string) =>
      fetch(`${base}/api/v1/webhooks/whatsapp`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-hub-signature-256": signatureHeader
        },
        body
      });
    assert.equal((await webhook(`sha256=${signature}`)).status, 202);
    assert.equal((await webhook("sha256=invalid")).status, 403);
    assert.equal((await fetch(`${base}/api/v1/missing`)).status, 404);
    assert.equal(frontendRequests, 1);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
