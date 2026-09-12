import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAdminAppointmentRoutes } from "../../src/modules/appointments/appointments.routes.js";
import type {
  createPanelAppointmentWithAudit as createAppointmentService,
  rescheduleAppointmentWithAudit as rescheduleService,
  cancelAppointmentWithAudit as cancelService
} from "../../src/modules/appointments/appointments.service";
import {
  AppointmentNotMutableError,
  TherapistAssignmentRequiredError
} from "../../src/modules/appointments/appointments.service.js";

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

type FakeAppointment = {
  id: string;
  scheduledAt: Date;
  endsAt: Date;
  therapyType: "individual" | "pareja" | "familiar";
  durationMinutes: number;
  modality: "online" | "presencial";
  status: "programada" | "confirmada" | "completada" | "cancelada";
  isManualException: boolean;
  locationLabel: string | null;
  meetingLink: string | null;
  cancelReason: string | null;
  cancelledAt: Date | null;
  cancellationNotice: "a_tiempo" | "tardia" | null;
  createdVia: "whatsapp" | "panel" | "system";
  patient: {
    id: string;
    fullName: string;
    whatsappPhone: string;
    birthdate: Date | null;
  };
  therapist: {
    id: string;
    isActive: boolean;
    user: { fullName: string } | null;
  };
};

const fakeAppointment = (
  overrides: Partial<FakeAppointment> = {}
): FakeAppointment => ({
  id: "33333333-3333-4333-8333-333333333333",
  scheduledAt: new Date("2026-09-15T16:00:00.000Z"),
  endsAt: new Date("2026-09-15T17:00:00.000Z"),
  therapyType: "individual",
  durationMinutes: 60,
  modality: "online",
  status: "confirmada",
  isManualException: false,
  locationLabel: null,
  meetingLink: null,
  cancelReason: null,
  cancelledAt: null,
  cancellationNotice: null,
  createdVia: "panel",
  patient: {
    id: "22222222-2222-4222-8222-222222222222",
    fullName: "Paciente de Prueba",
    whatsappPhone: "5215500000000",
    birthdate: new Date("1990-05-20T00:00:00.000Z")
  },
  therapist: {
    id: "11111111-1111-4111-8111-111111111111",
    isActive: true,
    user: { fullName: "Terapeuta de Prueba" }
  },
  ...overrides
});

type AuditEvent = {
  action: string;
  actorUserId?: string;
  entityType: string;
  result: string;
  requestId?: string;
};

const withAdminServer = async (
  run: (baseUrl: string) => Promise<void>,
  options: {
    createThrows?: boolean;
    rescheduleThrows?: boolean;
  } = {}
) => {
  const events: { audit: AuditEvent[] } = { audit: [] };
  const captureAudit = (input: {
    audit: {
      action: string;
      actorUserId?: string;
      entityType: string;
      result: string;
      metadata?: unknown;
    };
  }) => {
    events.audit.push({
      action: input.audit.action,
      actorUserId: input.audit.actorUserId,
      entityType: input.audit.entityType,
      result: input.audit.result,
      requestId: (input.audit.metadata as { requestId?: string }).requestId
    });
  };
  const app = express();
  app.use(express.json());
  app.use(
    createAdminAppointmentRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized,
      listAppointmentsForCalendar: (async () => {
        return [
          {
            id: "33333333-3333-4333-8333-333333333333",
            scheduledAt: "2026-09-07T00:00:00.000Z",
            endsAt: "2026-09-07T17:00:00.000Z",
            therapyType: "individual",
            durationMinutes: 60,
            modality: "online",
            status: "confirmada",
            isManualException: false,
            locationLabel: null,
            meetingLink: null,
            cancelReason: null,
            cancelledAt: null,
            cancellationNotice: null,
            createdVia: "whatsapp",
            paymentStatus: "pendiente",
            patientId: "22222222-2222-4222-8222-222222222222",
            patientName: "Paciente de Prueba",
            patientPhone: "5215500000000",
            patientBirthdate: "1990-05-20",
            therapistId: "11111111-1111-4111-8111-111111111111",
            therapistName: "Terapeuta de Prueba",
            therapistIsActive: true
          }
        ];
      }) as typeof import("../../src/modules/appointments/appointments.service").listAppointmentsForCalendar,
      createPanelAppointmentWithAudit: (async (
        input: Parameters<typeof createAppointmentService>[0]
      ) => {
        if (options.createThrows) {
          throw new TherapistAssignmentRequiredError("no active therapist");
        }
        captureAudit(input);
        return fakeAppointment({ scheduledAt: input.scheduledAt });
      }) as typeof createAppointmentService,
      rescheduleAppointmentWithAudit: (async (
        input: Parameters<typeof rescheduleService>[0]
      ) => {
        if (options.rescheduleThrows) {
          throw new AppointmentNotMutableError("not mutable");
        }
        captureAudit(input);
        return fakeAppointment({
          scheduledAt: input.scheduledAt,
          therapyType: input.therapyType ?? "individual"
        });
      }) as typeof rescheduleService,
      cancelAppointmentWithAudit: (async (
        input: Parameters<typeof cancelService>[0]
      ) => {
        captureAudit(input);
        return fakeAppointment({
          status: "cancelada",
          cancelReason: input.reason,
          cancelledAt: new Date("2026-09-11T10:00:00.000Z"),
          cancellationNotice: "a_tiempo"
        });
      }) as typeof cancelService
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
    await run(`http://127.0.0.1:${address.port}`);
    return events;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("the calendar range lists appointments in calendar shape", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/appointments?from=2026-09-07T00:00:00.000Z&to=2026-09-14T00:00:00.000Z`
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      appointments: Array<{
        id: string;
        patientName: string;
        therapistName: string | null;
        paymentStatus: string;
      }>;
    };
    assert.equal(body.appointments.length, 1);
    assert.equal(body.appointments[0].patientName, "Paciente de Prueba");
    assert.equal(body.appointments[0].therapistName, "Terapeuta de Prueba");
    assert.equal(body.appointments[0].paymentStatus, "pendiente");
  });

  assert.deepEqual(events.audit, []);
});

test("the calendar range rejects missing or invalid dates", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const missing = await fetch(`${baseUrl}/appointments`);
    assert.equal(missing.status, 400);
    const malformed = await fetch(
      `${baseUrl}/appointments?from=nope&to=2026-09-14T00:00:00.000Z`
    );
    assert.equal(malformed.status, 400);
  });

  assert.deepEqual(events.audit, []);
});

test("an admin creates an appointment from the panel and it is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/appointments`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "panel-test"
      },
      body: JSON.stringify({
        patient: {
          fullName: "Paciente de Prueba",
          whatsappPhone: "5215500000000",
          birthdate: "1990-05-20"
        },
        scheduledAt: "2026-09-15T16:00:00.000Z",
        modality: "online",
        therapyType: "individual"
      })
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      appointment: { therapyType: string };
    };
    assert.equal(body.appointment.therapyType, "individual");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["appointment_created"]
  );
  assert.equal(events.audit[0].actorUserId, requestSession.user.id);
  assert.equal(events.audit[0].entityType, "appointment");
  assert.equal(events.audit[0].result, "success");
  assert.equal(events.audit[0].requestId, "request-1");
});

test("creating an appointment without an assigned therapist is rejected", async () => {
  const events = await withAdminServer(
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/appointments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patient: {
            fullName: "Paciente Nuevo",
            whatsappPhone: "5215500000001",
            birthdate: "1988-03-15"
          },
          scheduledAt: "2026-09-16T16:00:00.000Z",
          modality: "presencial",
          therapyType: "individual"
        })
      });
      assert.equal(response.status, 409);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "conflict"
      );
    },
    { createThrows: true }
  );

  assert.deepEqual(events.audit, []);
});

test("an admin reschedules an appointment and it is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          scheduledAt: "2026-09-18T18:00:00.000Z",
          therapyType: "pareja"
        })
      }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      appointment: { scheduledAt: string };
    };
    assert.equal(body.appointment.scheduledAt, "2026-09-18T18:00:00.000Z");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["appointment_rescheduled"]
  );
});

test("an admin cancels an appointment with a reason and it is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333/cancel`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "La paciente no puede asistir" })
      }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      appointment: {
        status: string;
        cancellationNotice: "a_tiempo" | "tardia";
      };
    };
    assert.equal(body.appointment.status, "cancelada");
    assert.equal(body.appointment.cancellationNotice, "a_tiempo");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["appointment_cancelled"]
  );
});

test("immutable appointments cannot be rescheduled", async () => {
  const events = await withAdminServer(
    async (baseUrl) => {
      const response = await fetch(
        `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scheduledAt: "2026-09-18T18:00:00.000Z" })
        }
      );
      assert.equal(response.status, 409);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "conflict"
      );
    },
    { rescheduleThrows: true }
  );

  assert.deepEqual(events.audit, []);
});

test("invalid identifiers and payloads are rejected on appointment endpoints", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const badPath = await fetch(`${baseUrl}/appointments/not-a-uuid`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: "2026-09-18T18:00:00.000Z" })
    });
    assert.equal(badPath.status, 400);

    const missingDate = await fetch(`${baseUrl}/appointments`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        patientId: "22222222-2222-4222-8222-222222222222",
        modality: "online",
        therapyType: "individual"
      })
    });
    assert.equal(missingDate.status, 400);

    const blankCancel = await fetch(
      `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333/cancel`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: "" })
      }
    );
    assert.equal(blankCancel.status, 400);
  });

  assert.deepEqual(events.audit, []);
});
