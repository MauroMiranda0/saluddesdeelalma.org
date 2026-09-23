import assert from "node:assert/strict";
import test from "node:test";

import {
  APPOINTMENTS_UPDATED_EVENT,
  notifyAppointmentsUpdated
} from "../../lib/admin/appointment-updates";

test("notifica a las vistas cuando una cita cambia", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const eventTarget = new EventTarget();
  let notifications = 0;

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: eventTarget
  });
  eventTarget.addEventListener(APPOINTMENTS_UPDATED_EVENT, () => {
    notifications += 1;
  });

  try {
    notifyAppointmentsUpdated();
    assert.equal(notifications, 1);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      delete (globalThis as { window?: Window }).window;
    }
  }
});
