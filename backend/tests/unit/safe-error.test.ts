import assert from "node:assert/strict";
import test from "node:test";

import {
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
