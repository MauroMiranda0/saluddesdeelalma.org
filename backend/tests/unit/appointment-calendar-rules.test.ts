import assert from "node:assert/strict";
import test from "node:test";

import {
  cancellationNoticeFor,
  paymentStatusOf
} from "../../src/modules/appointments/appointments.service.js";

test("payment status resolves a validated full payment to completado", () => {
  assert.equal(
    paymentStatusOf([{ paymentType: "completo", status: "validado" }]),
    "completado"
  );
  assert.equal(
    paymentStatusOf([
      { paymentType: "anticipo", status: "validado" },
      { paymentType: "completo", status: "validado" }
    ]),
    "completado"
  );
  assert.equal(
    paymentStatusOf([{ paymentType: "completo", status: "rechazado" }]),
    "pendiente"
  );
});

test("payment status surfaces anticipo regardless of its validation state", () => {
  assert.equal(
    paymentStatusOf([
      { paymentType: "anticipo", status: "pendiente_validacion" }
    ]),
    "anticipo"
  );
  assert.equal(
    paymentStatusOf([{ paymentType: "anticipo", status: "validado" }]),
    "anticipo"
  );
});

test("payment status defaults to pendiente without payments", () => {
  assert.equal(paymentStatusOf([]), "pendiente");
});

test("cancellation is a_tiempo when done at least 24 hours before the session", () => {
  const scheduledAt = new Date("2026-09-15T16:00:00.000Z");
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-14T16:00:00.000Z")),
    "a_tiempo"
  );
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-14T15:59:59.999Z")),
    "a_tiempo"
  );
});

test("cancellation is tardia when done within the last 24 hours", () => {
  const scheduledAt = new Date("2026-09-15T16:00:00.000Z");
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-14T16:00:00.001Z")),
    "tardia"
  );
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-15T08:00:00.000Z")),
    "tardia"
  );
});
