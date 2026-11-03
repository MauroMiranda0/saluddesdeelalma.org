import assert from "node:assert/strict";
import test from "node:test";

import { safeErrorFields } from "../../src/lib/safe-error.js";

test("safe error fields expose only an error type, never error details", () => {
  const secret = "token fake-secret; clinical message and phone";
  const fields = safeErrorFields(new Error(secret));

  assert.deepEqual(fields, { errorType: "Error" });
  assert.equal(JSON.stringify(fields).includes(secret), false);
  assert.deepEqual(safeErrorFields(secret), { errorType: "UnknownError" });
});
