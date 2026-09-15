import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { createPaymentRoutes } from "../../src/modules/payments/payments.routes.js";

const requestSession = {
  id: "00000000-0000-0000-0000-000000000001",
  jwtId: "00000000-0000-0000-0000-000000000002",
  expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  user: {
    id: "00000000-0000-0000-0000-000000000003",
    username: "admin",
    email: "admin@saluddesdeelalma.org",
    fullName: "Jocelyn Gutiérrez",
    role: "admin" as const
  }
};

const authenticated: RequestHandler = (request, response, next) => {
  request.adminSession = requestSession;
  response.locals.requestId = "request-1";
  next();
};

const authorized: RequestHandler = (_request, _response, next) => next();

const fakePayment = (status: "pendiente_validacion" | "validado") => ({
  id: "44444444-4444-4444-8444-444444444444",
  paymentType: "completo" as const,
  amount: { toString: () => "500" },
  method: "transferencia" as const,
  status,
  proofReference: "comprobante-123",
  paidAt: new Date("2026-09-15T16:00:00.000Z"),
  createdAt: new Date("2026-09-15T16:00:00.000Z")
});

test("the admin can register, remind and confirm a payment", async () => {
  const captured: {
    payment?: { appointmentId: string; patientId: string; amount: number };
    confirmedPaymentId?: string;
    remindedAppointmentId?: string;
  } = {};
  const app = express();
  app.use(express.json());
  app.use(
    createPaymentRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized,
      createPaymentWithAudit: (async (input) => {
        captured.payment = input.payment;
        return fakePayment("pendiente_validacion") as never;
      }) as never,
      confirmPaymentWithAudit: (async (input) => {
        captured.confirmedPaymentId = input.paymentId;
        return fakePayment("validado") as never;
      }) as never,
      sendPaymentReminderWithAudit: (async (input) => {
        captured.remindedAppointmentId = input.appointmentId;
      }) as never
    })
  );
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  try {
    const registered = await fetch(`${baseUrl}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        appointmentId: "33333333-3333-4333-8333-333333333333",
        patientId: "22222222-2222-4222-8222-222222222222",
        paymentType: "completo",
        amount: 500,
        method: "transferencia",
        proofReference: "comprobante-123"
      })
    });
    assert.equal(registered.status, 201);
    assert.equal(
      ((await registered.json()) as { payment: { status: string } }).payment.status,
      "pendiente_validacion"
    );

    const confirmed = await fetch(
      `${baseUrl}/payments/44444444-4444-4444-8444-444444444444/confirm`,
      { method: "POST" }
    );
    assert.equal(confirmed.status, 200);
    assert.equal(
      ((await confirmed.json()) as { payment: { status: string } }).payment.status,
      "validado"
    );

    const reminded = await fetch(
      `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333/payment-reminder`,
      { method: "POST" }
    );
    assert.equal(reminded.status, 204);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }

  assert.deepEqual(captured.payment, {
    appointmentId: "33333333-3333-4333-8333-333333333333",
    patientId: "22222222-2222-4222-8222-222222222222",
    paymentType: "completo",
    amount: 500,
    method: "transferencia",
    proofReference: "comprobante-123"
  });
  assert.equal(
    captured.confirmedPaymentId,
    "44444444-4444-4444-8444-444444444444"
  );
  assert.equal(
    captured.remindedAppointmentId,
    "33333333-3333-4333-8333-333333333333"
  );
});

test("payment endpoints reject invalid identifiers and payloads", async () => {
  const app = express();
  app.use(express.json());
  app.use(
    createPaymentRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized
    })
  );
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    const invalidPayment = await fetch(`http://127.0.0.1:${address.port}/payments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({})
    });
    assert.equal(invalidPayment.status, 400);

    const invalidIdentifier = await fetch(
      `http://127.0.0.1:${address.port}/payments/not-a-uuid/confirm`,
      { method: "POST" }
    );
    assert.equal(invalidIdentifier.status, 400);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
