import assert from "node:assert/strict";
import test from "node:test";

import { previousDayReminderAt } from "../../src/modules/reminders/reminders.service.js";

test("previous-day reminder is scheduled for 18:00 Mexico City", () => {
  const appointment = new Date("2026-09-15T15:00:00.000Z");

  assert.equal(
    previousDayReminderAt(appointment).toISOString(),
    "2026-09-15T00:00:00.000Z"
  );
});
