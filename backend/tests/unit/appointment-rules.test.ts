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
