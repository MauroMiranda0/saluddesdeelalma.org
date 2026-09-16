import assert from "node:assert/strict";
import test from "node:test";

import {
  assertPaymentCanBeConfirmed,
  amountMatchesAdvanceRate,
  amountMatchesFullRate,
  dispatchManualPaymentReminder,
  PaymentNotMutableError
} from "../../src/modules/payments/payments.service.js";

test("an advance must equal 50 percent of the configured session rate", () => {
  assert.equal(
    amountMatchesAdvanceRate(450, { toString: () => "900.00" }),
    true
  );
  assert.equal(
    amountMatchesAdvanceRate(449.99, { toString: () => "900.00" }),
    false
  );
});

test("a full payment must equal the configured session rate", () => {
  const rate = { toString: () => "1000.00" };

  assert.equal(amountMatchesFullRate(1000, rate), true);
  assert.equal(amountMatchesFullRate(999.99, rate), false);
  assert.equal(amountMatchesFullRate(1000.01, rate), false);
});

test("only pending payments can be confirmed", () => {
  assert.doesNotThrow(() =>
    assertPaymentCanBeConfirmed({
      paymentStatus: "pendiente_validacion",
      appointmentStatus: "programada"
    })
  );
  assert.throws(
    () =>
      assertPaymentCanBeConfirmed({
        paymentStatus: "validado",
        appointmentStatus: "programada"
      }),
    PaymentNotMutableError
  );
  assert.throws(
    () =>
      assertPaymentCanBeConfirmed({
        paymentStatus: "pendiente_validacion",
        appointmentStatus: "cancelada"
      }),
    PaymentNotMutableError
  );
});

test("a manual reminder is not dispatched if its durable trace cannot be written", async () => {
  let dispatched = false;

  await assert.rejects(
    dispatchManualPaymentReminder({
      persistTrace: async () => {
        throw new Error("audit store unavailable");
      },
      dispatch: async () => {
        dispatched = true;
      }
    }),
    /audit store unavailable/
  );

  assert.equal(dispatched, false);
});
