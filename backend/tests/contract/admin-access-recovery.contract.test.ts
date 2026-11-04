import assert from "node:assert/strict";
import test from "node:test";

import { createApp } from "../../src/app.js";
import { isValidAdminAccessRecoveryToken } from "../../src/modules/auth/auth.routes.js";

const recoveryToken = "fictitious-local-admin-recovery-token-32-characters";

test("admin access recovery requires an exact configured token of at least 32 characters", () => {
  assert.equal(
    isValidAdminAccessRecoveryToken(recoveryToken, recoveryToken),
    true
  );
  assert.equal(
    isValidAdminAccessRecoveryToken(
      "different-fictitious-recovery-token-32-chars",
      recoveryToken
    ),
    false
  );
  assert.equal(isValidAdminAccessRecoveryToken("short", recoveryToken), false);
  assert.equal(
    isValidAdminAccessRecoveryToken(recoveryToken, undefined),
    false
  );
  assert.equal(
    isValidAdminAccessRecoveryToken(undefined, recoveryToken),
    false
  );
});

test("admin access recovery endpoint is rate limited", async () => {
  const server = createApp().listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");

  try {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/auth/admin-access/reactivate`,
        {
          method: "POST",
          headers: { authorization: "Bearer invalid-local-token" }
        }
      );
      statuses.push(response.status);
      await response.body?.cancel();
    }

    assert.deepEqual(statuses, [401, 401, 401, 401, 401, 429]);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
