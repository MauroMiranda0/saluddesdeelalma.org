import assert from "node:assert/strict";
import test from "node:test";

import {
  AppointmentScheduleError,
  assertWhatsAppAppointmentSchedule,
  therapyDurationMinutes
} from "../../src/modules/appointments/appointments.service.js";

test("session types have fixed durations", () => {
  assert.equal(therapyDurationMinutes("individual"), 60);
  assert.equal(therapyDurationMinutes("pareja"), 90);
  assert.equal(therapyDurationMinutes("familiar"), 90);
});

test("a session must end within regular business hours", () => {
  // 20:00 Mexico City is 02:00 UTC the following day.
  assert.doesNotThrow(() =>
    assertWhatsAppAppointmentSchedule(new Date("2026-09-15T02:00:00.000Z"), 60)
  );
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-15T02:00:00.000Z"),
        90
      ),
    AppointmentScheduleError
  );
});

test("any start minute within Monday to Friday 09:00-21:00 is allowed", () => {
  // 17:05, 17:15 and 17:25 Mexico City on Monday 2026-09-14.
  for (const utc of [
    "2026-09-14T23:05:00.000Z",
    "2026-09-14T23:15:00.000Z",
    "2026-09-14T23:25:00.000Z"
  ]) {
    assert.doesNotThrow(() =>
      assertWhatsAppAppointmentSchedule(new Date(utc), 60)
    );
  }
  // A 90-minute session starting at 19:15 ends at 20:45 (allowed).
  assert.doesNotThrow(() =>
    assertWhatsAppAppointmentSchedule(new Date("2026-09-15T01:15:00.000Z"), 90)
  );
});

test("sessions starting too close to 21:00 are rejected", () => {
  // 20:30 start with 60 minutes ends at 21:30 (too late).
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-15T02:30:00.000Z"),
        60
      ),
    AppointmentScheduleError
  );
  // 19:45 start with 90 minutes ends at 21:15 (too late).
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-15T01:45:00.000Z"),
        90
      ),
    AppointmentScheduleError
  );
});

test("sessions before 09:00 or on weekends are rejected", () => {
  // 08:30 Monday 2026-09-14.
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-14T14:30:00.000Z"),
        60
      ),
    AppointmentScheduleError
  );
  // Saturday 2026-09-12 and Sunday 2026-09-13 at 09:00.
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-12T15:00:00.000Z"),
        60
      ),
    AppointmentScheduleError
  );
  assert.throws(
    () =>
      assertWhatsAppAppointmentSchedule(
        new Date("2026-09-13T15:00:00.000Z"),
        60
      ),
    AppointmentScheduleError
  );
});
