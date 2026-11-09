import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { createApp } from "../../src/app.js";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";

const token = "local-test-recovery-token-at-least-32-characters";
const secret = "private-connection-credentials";
const path = "/admin-access/diagnose-database";

const withServer = async (
  app: express.Express,
  run: (base: string) => Promise<void>
) => {
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("diagnostic requires recovery authorization and exposes only safe fields", async () => {
  let checks = 0;
  const app = express();
  app.use(
    createAuthRoutes({
      adminAccessRecoveryToken: token,
      checkDatabase: async () => {
        checks += 1;
        throw Object.assign(new Error(secret), {
          errorCode: "P1001",
          meta: { connection: secret }
        });
      }
    })
  );
  app.use(errorHandler);

  await withServer(app, async (base) => {
    for (const authorization of ["", "Bearer invalid"]) {
      const response = await fetch(`${base}${path}`, {
        method: "POST",
        headers: { authorization }
      });
      assert.equal(response.status, 401);
      assert.equal(response.headers.get("cache-control"), "no-store");
      assert.equal((await response.text()).includes(secret), false);
    }
    assert.equal(checks, 0);

    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` }
    });
    assert.equal(response.status, 503);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.text();
    assert.deepEqual(JSON.parse(body), {
      database: false,
      errorType: "Error",
      errorCode: "P1001"
    });
    assert.equal(body.includes(secret), false);
    assert.equal(body.includes(token), false);
    assert.equal(checks, 1);
  });
});

test("diagnostic reports database success and hides unsafe error codes", async () => {
  let checks = 0;
  const app = express();
  app.use(
    createAuthRoutes({
      adminAccessRecoveryToken: token,
      checkDatabase: async () => {
        checks += 1;
        if (checks === 2)
          throw Object.assign(new Error(secret), { code: secret });
      }
    })
  );
  app.use(errorHandler);
  await withServer(app, async (base) => {
    const request = () =>
      fetch(`${base}${path}`, {
        method: "POST",
        headers: { authorization: `Bearer ${token}` }
      });
    const success = await request();
    assert.equal(success.status, 200);
    assert.deepEqual(await success.json(), { database: true });
    const failure = await request();
    assert.equal(failure.status, 503);
    assert.deepEqual(await failure.json(), {
      database: false,
      errorType: "Error"
    });
  });
});

test("diagnostic endpoint is rate limited on the real app", async () => {
  await withServer(createApp(), async (base) => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(`${base}/api/v1/auth${path}`, {
        method: "POST",
        headers: { authorization: "Bearer invalid" }
      });
      statuses.push(response.status);
      await response.body?.cancel();
    }
    assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
  });
});
