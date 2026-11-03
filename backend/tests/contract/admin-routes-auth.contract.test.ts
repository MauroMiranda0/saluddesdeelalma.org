import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAdminAppointmentRoutes } from "../../src/modules/appointments/appointments.routes.js";
import { createPaymentRoutes } from "../../src/modules/payments/payments.routes.js";
import { createTherapistAdminRoutes } from "../../src/modules/therapists/therapists.routes.js";

test("agenda, patients, therapists, payments, and proof routes deny unauthenticated access before handlers", async () => {
  let authorizationCalls = 0;
  const denyUnauthenticated: RequestHandler = (_request, response) => {
    response.status(401).json({ code: "unauthorized" });
  };
  const shouldNotAuthorize: RequestHandler = (_request, _response, next) => {
    authorizationCalls += 1;
    next();
  };
  const app = express();
  app.use(express.json());
  app.use(
    createAdminAppointmentRoutes({
      authenticate: denyUnauthenticated,
      authorizeAdmin: shouldNotAuthorize
    })
  );
  app.use(
    createTherapistAdminRoutes({
      authenticate: denyUnauthenticated,
      authorizeAdmin: shouldNotAuthorize
    })
  );
  app.use(
    createPaymentRoutes({
      authenticate: denyUnauthenticated,
      authorizeAdmin: shouldNotAuthorize
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
    const baseUrl = `http://127.0.0.1:${address.port}`;
    const responses = await Promise.all([
      fetch(`${baseUrl}/appointments`, { method: "POST" }),
      fetch(`${baseUrl}/patients`, { method: "POST" }),
      fetch(`${baseUrl}/therapists`, { method: "POST" }),
      fetch(`${baseUrl}/payments`, { method: "POST" }),
      fetch(
        `${baseUrl}/payment-proofs/00000000-0000-4000-8000-000000000001/associate`,
        { method: "POST" }
      )
    ]);

    assert.deepEqual(
      responses.map((response) => response.status),
      [401, 401, 401, 401, 401]
    );
    assert.equal(authorizationCalls, 0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
