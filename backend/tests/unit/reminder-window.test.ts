import assert from "node:assert/strict";
import test from "node:test";

import { previousDayReminderAt } from "../../src/modules/reminders/reminders.service.js";
import {
  isPriorDayReminderDue,
  isPriorDayWindow
} from "../../src/modules/reminders/reminder-dispatcher.js";

test("previous-day reminder is scheduled for 18:00 Mexico City", () => {
  const appointment = new Date("2026-09-15T15:00:00.000Z");

  assert.equal(
    previousDayReminderAt(appointment).toISOString(),
    "2026-09-15T00:00:00.000Z"
  );
});

test("previous-day reminder crosses month and year boundaries in Mexico City", () => {
  const appointment = new Date("2027-01-01T15:00:00.000Z");

  assert.equal(
    previousDayReminderAt(appointment).toISOString(),
    "2027-01-01T00:00:00.000Z"
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
  assert.equal(
    isPriorDayReminderDue(nowForTomorrow, appointmentYesterday),
    false
  );

  const newYearsEve = new Date("2026-12-31T06:00:00.000Z");
  const newYearsDayAppointment = new Date("2027-01-01T12:00:00.000Z");
  assert.equal(
    isPriorDayReminderDue(newYearsEve, newYearsDayAppointment),
    true
  );
});

test("a prior-day reminder is due at the exact start of its window", () => {
  const appointment = new Date("2026-09-18T15:00:00.000Z");
  const reminderAt = previousDayReminderAt(appointment);

  assert.equal(isPriorDayReminderDue(reminderAt, appointment), true);
});

test("the prior-day window includes 18:00 and excludes 19:00 in Mexico City", () => {
  assert.equal(isPriorDayWindow(new Date("2026-09-16T00:00:00.000Z")), true);
  assert.equal(isPriorDayWindow(new Date("2026-09-16T00:59:59.999Z")), true);
  assert.equal(isPriorDayWindow(new Date("2026-09-16T01:00:00.000Z")), false);
});
