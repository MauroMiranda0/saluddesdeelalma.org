import assert from "node:assert/strict";
import test from "node:test";

import { audit } from "../../src/modules/audit/audit.service.js";

test("audit propagates persistence failures", async () => {
  await assert.rejects(
    audit(
      {
        actorChannel: "system",
        action: "test_action",
        entityType: "test",
        result: "success"
      },
      async () => {
        throw new Error("audit store unavailable");
      }
    ),
    /audit store unavailable/
  );
});
