import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { parseFrontendOrigins } from "../../src/config/frontend-origins.js";
import { createCorsMiddleware } from "../../src/middleware/cors.js";

test("parses the two explicit production frontend origins", () => {
  assert.deepEqual(
    parseFrontendOrigins(
      "https://saluddesdeelalma.org,https://www.saluddesdeelalma.org"
    ),
    ["https://saluddesdeelalma.org", "https://www.saluddesdeelalma.org"]
  );
});

test("rejects malformed, empty, non-origin, and duplicate CORS entries", () => {
  for (const value of [
    "https://saluddesdeelalma.org,",
    "not-a-url",
    "https://saluddesdeelalma.org/admin",
    "https://saluddesdeelalma.org,https://saluddesdeelalma.org"
  ]) {
    assert.throws(() => parseFrontendOrigins(value));
  }
});

const withCorsServer = async (run: (baseUrl: string) => Promise<void>) => {
  const app = express();
  app.use(
    createCorsMiddleware([
      "https://saluddesdeelalma.org",
      "https://www.saluddesdeelalma.org"
    ])
  );
  app.get("/probe", (_request, response) => response.json({ ok: true }));

  const server = app.listen(0);
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

test("CORS autoriza ambos dominios explícitos con credenciales", async () => {
  await withCorsServer(async (baseUrl) => {
    for (const origin of [
      "https://saluddesdeelalma.org",
      "https://www.saluddesdeelalma.org"
    ]) {
      const response = await fetch(`${baseUrl}/probe`, {
        headers: { origin }
      });
      assert.equal(response.headers.get("access-control-allow-origin"), origin);
      assert.equal(
        response.headers.get("access-control-allow-credentials"),
        "true"
      );
    }
  });
});

test("CORS no autoriza orígenes desconocidos ni agrega headers a requests sin Origin", async () => {
  await withCorsServer(async (baseUrl) => {
    const unknownOrigin = await fetch(`${baseUrl}/probe`, {
      headers: { origin: "https://unknown.example" }
    });
    assert.equal(
      unknownOrigin.headers.get("access-control-allow-origin"),
      null
    );
    assert.equal(
      unknownOrigin.headers.get("access-control-allow-credentials"),
      null
    );

    const noOrigin = await fetch(`${baseUrl}/probe`);
    assert.equal(noOrigin.status, 200);
    assert.equal(noOrigin.headers.get("access-control-allow-origin"), null);
    assert.equal(
      noOrigin.headers.get("access-control-allow-credentials"),
      null
    );
  });
});
