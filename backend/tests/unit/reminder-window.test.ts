import assert from "node:assert/strict";
import test from "node:test";

import { previousDayReminderAt } from "../../src/modules/reminders/reminders.service.js";
import { isPriorDayReminderDue } from "../../src/modules/reminders/reminder-dispatcher.js";

test("previous-day reminder is scheduled for 18:00 Mexico City", () => {
  const appointment = new Date("2026-09-15T15:00:00.000Z");

  assert.equal(
    previousDayReminderAt(appointment).toISOString(),
    "2026-09-15T00:00:00.000Z"
  );
});

test("the prior-day reminder is due only the calendar day before a future appointment", () => {
  const nowForTomorrow = new Date("2026-09-15T06:00:00.000Z");
  const appointmentTomorrow = new Date("2026-09-16T12:00:00.000Z");
  assert.equal(
    isPriorDayReminderDue(nowForTomorrow, appointmentTomorrow),
    true
  );

  const nowForToday = new Date("2026-09-15T06:00:00.000Z");
  const appointmentToday = new Date("2026-09-15T15:00:00.000Z");
  assert.equal(isPriorDayReminderDue(nowForToday, appointmentToday), false);

  const appointmentYesterday = new Date("2026-09-14T20:00:00.000Z");
  assert.equal(isPriorDayReminderDue(nowForToday, appointmentYesterday), false);
});
