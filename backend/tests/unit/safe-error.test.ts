import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyDatabaseError,
  safeDatabaseErrorFields,
  safeErrorFields
} from "../../src/lib/safe-error.js";

test("safe error fields expose only an error type, never error details", () => {
  const secret = "token fake-secret; clinical message and phone";
  const fields = safeErrorFields(new Error(secret));

  assert.deepEqual(fields, { errorType: "Error" });
  assert.equal(JSON.stringify(fields).includes(secret), false);
  assert.deepEqual(safeErrorFields(secret), { errorType: "UnknownError" });
});

test("database error classification returns only predefined categories", () => {
  const samples = [
    ["version `GLIBC_2.29' not found", "glibc"],
    ["libssl.so.1.1: cannot open shared object file", "openssl"],
    ["Prisma Client could not locate the Query Engine", "engine_missing"],
    ["Unable to require private database connection", "engine_load"],
    ["Authentication failed against database server", "authentication"],
    ["Can't reach database server at private host", "unreachable"],
    ["connection timed out at private host", "timeout"],
    ["TLS certificate validation failed", "tls"],
    ["Tenant or user not found", "pooler_identity"],
    ["sensitive arbitrary error", "unknown"]
  ] as const;
  for (const [message, category] of samples) {
    assert.equal(classifyDatabaseError(new Error(message)), category);
  }
  assert.equal(classifyDatabaseError("secret"), "unknown");
});

test("database error fields expose only validated Prisma codes", () => {
  const secret = "postgresql://user:secret@example.com/db";
  const initializationError = Object.assign(new Error(secret), {
    errorCode: "P1001",
    meta: { connection: secret }
  });
  assert.deepEqual(safeDatabaseErrorFields(initializationError), {
    errorType: "Error",
    errorCode: "P1001"
  });

  const queryError = Object.assign(new Error(secret), { code: "P2021" });
  assert.deepEqual(safeDatabaseErrorFields(queryError), {
    errorType: "Error",
    errorCode: "P2021"
  });
  const unsafeError = Object.assign(new Error(secret), {
    code: secret,
    errorCode: secret
  });
  assert.deepEqual(safeDatabaseErrorFields(unsafeError), {
    errorType: "Error"
  });
  assert.deepEqual(safeDatabaseErrorFields(secret), {
    errorType: "UnknownError"
  });
});
