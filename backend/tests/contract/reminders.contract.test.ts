import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { AppError, errorHandler } from "../../src/middleware/error-handler.js";
import { createReminderRoutes } from "../../src/modules/reminders/reminders.routes.js";

const appointmentId = "33333333-3333-4333-8333-333333333333";

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

const withServer = async (
  routes: ReturnType<typeof createReminderRoutes>,
  run: (baseUrl: string) => Promise<void>
) => {
  const app = express();
  app.use(routes);
  app.use(errorHandler);
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("an authorized admin can query the documented reminder delivery-status contract", async () => {
  let queriedAppointmentId: string | undefined;
  await withServer(
    createReminderRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized,
      listAppointmentReminders: (async (id) => {
        queriedAppointmentId = id;
        return [
          {
            id: "44444444-4444-4444-8444-444444444444",
            reminderType: "recordatorio_24h",
            recipient: "paciente",
            scheduledAt: new Date("2026-09-14T00:00:00.000Z"),
            status: "fallido",
            attemptsCount: 2,
            lastError: "Provider timed out",
            sentAt: null
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            reminderType: "recordatorio_24h",
            recipient: "grupo_psicologas",
            scheduledAt: new Date("2026-09-14T00:00:00.000Z"),
            status: "enviado",
            attemptsCount: 1,
            lastError: null,
            sentAt: new Date("2026-09-14T00:05:00.000Z")
          }
        ] as never;
      }) as never
    }),
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/appointments/${appointmentId}/reminders`
      );

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        reminders: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            reminderType: "recordatorio_24h",
            recipient: "paciente",
            scheduledAt: "2026-09-14T00:00:00.000Z",
            status: "fallido",
            attemptsCount: 2,
            lastError: "Provider timed out",
            sentAt: null
          },
          {
            id: "55555555-5555-4555-8555-555555555555",
            reminderType: "recordatorio_24h",
            recipient: "grupo_psicologas",
            scheduledAt: "2026-09-14T00:00:00.000Z",
            status: "enviado",
            attemptsCount: 1,
            lastError: null,
            sentAt: "2026-09-14T00:05:00.000Z"
          }
        ]
      });
    }
  );

  assert.equal(queriedAppointmentId, appointmentId);
});

test("reminder queries reject invalid appointment identifiers", async () => {
  let queried = false;
  await withServer(
    createReminderRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized,
      listAppointmentReminders: (async () => {
        queried = true;
        return [];
      }) as never
    }),
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/appointments/not-a-uuid/reminders`
      );

      assert.equal(response.status, 400);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "validation_error"
      );
    }
  );

  assert.equal(queried, false);
});

test("reminder queries require authenticated and authorized admin middleware", async () => {
  let queried = false;
  const listAppointmentReminders = (async () => {
    queried = true;
    return [];
  }) as never;

  await withServer(
    createReminderRoutes({
      authenticate: (_request, _response, next) =>
        next(new AppError(401, "unauthorized", "Authentication required")),
      authorizeAdmin: authorized,
      listAppointmentReminders
    }),
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/appointments/${appointmentId}/reminders`
      );
      assert.equal(response.status, 401);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "unauthorized"
      );
    }
  );

  await withServer(
    createReminderRoutes({
      authenticate: authenticated,
      authorizeAdmin: (_request, _response, next) =>
        next(new AppError(403, "forbidden", "Admin identity required")),
      listAppointmentReminders
    }),
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/appointments/${appointmentId}/reminders`
      );
      assert.equal(response.status, 403);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "forbidden"
      );
    }
  );

  assert.equal(queried, false);
});
