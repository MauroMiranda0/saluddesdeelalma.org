import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../../src/app.js";
import { logger } from "../../src/lib/logger.js";

const withApp = async (
  checkDatabase: () => Promise<unknown>,
  run: (baseUrl: string) => Promise<void>
) => {
  const server = createApp({ checkDatabase }).listen(0);
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

test("API readiness returns the exact healthy contract and an ISO timestamp", async () => {
  let databaseChecks = 0;

  await withApp(
    async () => {
      databaseChecks += 1;
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        headers: { "x-request-id": "health-request-1" }
      });

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("x-request-id"), "health-request-1");

      const body = (await response.json()) as Record<string, unknown>;
      assert.deepEqual(Object.keys(body).sort(), [
        "database",
        "status",
        "timestamp"
      ]);
      assert.equal(body.status, "ok");
      assert.equal(body.database, true);
      assert.equal(typeof body.timestamp, "string");
      assert.equal(
        new Date(body.timestamp as string).toISOString(),
        body.timestamp
      );
      assert.equal(databaseChecks, 1);
    }
  );
});

test("API readiness returns an opaque unhealthy response when the database is unavailable", async () => {
  const internalError =
    "Database unavailable: synthetic-password and private connection details";

  await withApp(
    async () => {
      throw new Error(internalError);
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/v1/health`, {
        headers: { "x-request-id": "health-request-2" }
      });

      assert.equal(response.status, 503);
      assert.equal(response.headers.get("x-request-id"), "health-request-2");

      const body = (await response.json()) as Record<string, unknown>;
      assert.deepEqual(Object.keys(body).sort(), [
        "database",
        "status",
        "timestamp"
      ]);
      assert.equal(body.status, "unhealthy");
      assert.equal(body.database, false);
      assert.equal(typeof body.timestamp, "string");
      assert.equal(
        new Date(body.timestamp as string).toISOString(),
        body.timestamp
      );
      assert.equal(JSON.stringify(body).includes(internalError), false);
      assert.equal(JSON.stringify(body).includes("synthetic-password"), false);
    }
  );
});

test("the legacy health route remains a lightweight liveness check", async () => {
  let databaseChecks = 0;

  await withApp(
    async () => {
      databaseChecks += 1;
    },
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/health`);

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        status: "ok",
        service: "saluddesdeelalma-backend"
      });
      assert.equal(databaseChecks, 0);
    }
  );
});

test("readiness logs a safe Prisma error code without leaking error details", async () => {
  const secret = "postgresql://user:private-password@example.com/db";
  const error = Object.assign(new Error(secret), {
    errorCode: "P1001",
    meta: { url: secret }
  });
  const originalError = logger.error;
  const records: unknown[] = [];
  logger.error = ((record: unknown) => {
    records.push(record);
  }) as typeof logger.error;
  try {
    await withApp(
      async () => {
        throw error;
      },
      async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/v1/health`, {
          headers: { "x-request-id": "health-request-safe" }
        });
        assert.equal(response.status, 503);
        assert.equal(
          JSON.stringify(await response.json()).includes(secret),
          false
        );
      }
    );
    assert.deepEqual(records, [
      {
        event: "health_database_unavailable",
        requestId: "health-request-safe",
        errorType: "Error",
        errorCode: "P1001"
      }
    ]);
    assert.equal(JSON.stringify(records).includes(secret), false);
  } finally {
    logger.error = originalError;
  }
});
