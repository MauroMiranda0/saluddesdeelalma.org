import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { createCsrfProtection } from "../../src/middleware/csrf.js";
import { errorHandler } from "../../src/middleware/error-handler.js";

const withServer = async (run: (baseUrl: string) => Promise<void>) => {
  let mutations = 0;
  const app = express();
  app.use(
    createCsrfProtection(
      ["https://saluddesdeelalma.org", "https://www.saluddesdeelalma.org"],
      "sda_admin_session"
    )
  );
  app.post("/mutate", (_request, response) => {
    mutations += 1;
    response.sendStatus(204);
  });
  app.post("/api/v1/auth/login", (_request, response) => {
    mutations += 1;
    response.sendStatus(204);
  });
  app.use(errorHandler);

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

  return mutations;
};

test("CSRF allows a configured frontend origin for credentialed mutations", async () => {
  const mutations = await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/mutate`, {
      method: "POST",
      headers: {
        cookie: "sda_admin_session=opaque-session",
        origin: "https://www.saluddesdeelalma.org"
      }
    });

    assert.equal(response.status, 204);
  });

  assert.equal(mutations, 1);
});

test("CSRF blocks unknown and missing origins before a credentialed mutation", async () => {
  const mutations = await withServer(async (baseUrl) => {
    for (const origin of ["https://attacker.example", undefined]) {
      const headers = new Headers({
        cookie: "sda_admin_session=opaque-session"
      });
      if (origin) {
        headers.set("origin", origin);
      }
      const response = await fetch(`${baseUrl}/mutate`, {
        method: "POST",
        headers
      });

      assert.equal(response.status, 403);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "csrf_origin_denied"
      );
    }

    for (const origin of ["https://attacker.example", undefined]) {
      const headers = new Headers();
      if (origin) {
        headers.set("origin", origin);
      }
      const response = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: "POST",
        headers
      });

      assert.equal(response.status, 403);
    }
  });

  assert.equal(mutations, 0);
});
