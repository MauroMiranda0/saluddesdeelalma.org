import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { errorHandler, AppError } from "../../src/middleware/error-handler.js";
import { createTherapistAdminRoutes } from "../../src/modules/therapists/therapists.routes.js";
import type {
  assignPatientTherapistWithAudit as assignTherapistService,
  createClinicalProfileWithAudit as createProfileService,
  setClinicalProfileActiveWithAudit as setProfileActiveService
} from "../../src/modules/therapists/therapists.service";
import type { completeAppointmentWithAudit as completeService } from "../../src/modules/appointments/appointments.service";
import type {
  createAdminPatientWithAudit as createPatientService,
  setPatientStatusWithAudit as setPatientStatusService
} from "../../src/modules/patients/patients.service";

const requestSession = {
  id: "00000000-0000-0000-0000-000000000001",
  jwtId: "00000000-0000-0000-0000-000000000002",
  expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  user: {
    id: "00000000-0000-0000-0000-000000000003",
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

const fakeProfile = (id: string) => ({
  id,
  phone: "5211111111111",
  isActive: true,
  user: {
    fullName: "Terapeuta de Prueba",
    email: `therapist-${id}@directory.local`
  }
});

type AuditEvent = {
  action: string;
  actorUserId?: string;
  entityType: string;
  result: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
};

const withAdminServer = async (run: (baseUrl: string) => Promise<void>) => {
  const events: { audit: AuditEvent[] } = { audit: [] };
  const app = express();
  app.use(express.json());
  app.use(
    createTherapistAdminRoutes({
      authenticate: authenticated,
      authorizeAdmin: authorized,
      createClinicalProfileWithAudit: (async (
        input: Parameters<typeof createProfileService>[0]
      ) => {
        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });
        return fakeProfile("11111111-1111-4111-8111-111111111111");
      }) as typeof createProfileService,
      setClinicalProfileActiveWithAudit: (async (
        input: Parameters<typeof setProfileActiveService>[0]
      ) => {
        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });
        return { ...fakeProfile(input.therapistId), isActive: input.isActive };
      }) as typeof setProfileActiveService,
      assignPatientTherapistWithAudit: (async (
        input: Parameters<typeof assignTherapistService>[0]
      ) => {
        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });
        return {
          id: input.patientId,
          fullName: "Paciente de Prueba",
          whatsappPhone: "5215500000000",
          status: "activo",
          assignedTherapistId: input.therapistId
        };
      }) as typeof assignTherapistService,
      createAdminPatientWithAudit: (async (
        input: Parameters<typeof createPatientService>[0]
      ) => {
        if (input.patient.whatsappPhone === "5215599999999") {
          throw new AppError(
            409,
            "patient_already_exists",
            "A patient with that WhatsApp number already exists"
          );
        }

        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });

        return {
          id: "44444444-4444-4444-8444-444444444444",
          fullName: input.patient.fullName,
          whatsappPhone: input.patient.whatsappPhone,
          status: "activo" as const,
          assignedTherapistId: input.therapistId ?? null
        };
      }) as typeof createPatientService,
      setPatientStatusWithAudit: (async (
        input: Parameters<typeof setPatientStatusService>[0]
      ) => {
        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });
        return {
          id: input.patientId,
          fullName: "Paciente de Prueba",
          whatsappPhone: "5215500000000",
          status: input.isActive ? ("activo" as const) : ("inactivo" as const),
          assignedTherapistId: null
        };
      }) as typeof setPatientStatusService,
      completeAppointmentWithAudit: (async (
        input: Parameters<typeof completeService>[0]
      ) => {
        events.audit.push({
          action: input.audit.action,
          actorUserId: input.audit.actorUserId,
          entityType: input.audit.entityType,
          result: input.audit.result,
          ipAddress: input.audit.ipAddress,
          userAgent: input.audit.userAgent,
          requestId: (input.audit.metadata as { requestId?: string }).requestId,
          metadata: (input.audit.metadata ?? {}) as Record<string, unknown>
        });
        return {
          id: input.appointmentId,
          status: "completada",
          completedAt: new Date("2026-09-11T12:00:00.000Z")
        };
      }) as typeof completeService,
      listTherapistProfiles: async () => [
        {
          ...fakeProfile("11111111-1111-4111-8111-111111111111"),
          isActive: true
        }
      ],
      listPatientsForAdmin: async () => [
        {
          id: "22222222-2222-4222-8222-222222222222",
          fullName: "Paciente de Prueba",
          whatsappPhone: "5215500000000",
          status: "activo",
          birthdate: new Date("1990-01-15T00:00:00.000Z"),
          preferredModality: "online",
          email: null,
          notes: "removed",
          assignedTherapistId: null
        }
      ],
      listActiveAppointmentsForAdmin: async () => [
        {
          id: "33333333-3333-4333-8333-333333333333",
          scheduledAt: new Date("2026-09-15T16:00:00.000Z"),
          status: "confirmada",
          patient: { fullName: "Paciente de Prueba" },
          therapist: { user: { fullName: "Terapeuta de Prueba" } }
        }
      ]
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

test("admin creates a clinical profile and the creation is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/therapists`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "panel-test"
      },
      body: JSON.stringify({
        fullName: "Terapeuta Uno",
        phone: "5211111111111",
        email: "uno@example.org"
      })
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      therapistProfile: {
        id: string;
        fullName: string;
        email: string;
        phone: string;
        isActive: boolean;
      };
    };
    assert.equal(body.therapistProfile.fullName, "Terapeuta de Prueba");
    assert.equal(body.therapistProfile.phone, "5211111111111");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["therapist_profile_created"]
  );
  assert.equal(events.audit[0].actorUserId, requestSession.user.id);
  assert.equal(events.audit[0].entityType, "therapist_profile");
  assert.equal(events.audit[0].result, "success");
  assert.equal(events.audit[0].requestId, "request-1");
  assert.equal(events.audit[0].userAgent, "panel-test");
});

test("admin activating a clinical profile is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/therapists/11111111-1111-4111-8111-111111111111`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false })
      }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      therapistProfile: { isActive: boolean };
    };
    assert.equal(body.therapistProfile.isActive, false);
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["therapist_profile_updated"]
  );
});

test("assigning and reassigning a patient to a therapist is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/patients/22222222-2222-4222-8222-222222222222/therapist`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          therapistId: "11111111-1111-4111-8111-111111111111"
        })
      }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      patient: { assignedTherapistId: string | null };
    };
    assert.equal(
      body.patient.assignedTherapistId,
      "11111111-1111-4111-8111-111111111111"
    );
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["patient_therapist_assigned"]
  );
});

test("admin deactivates a patient and it is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/patients/22222222-2222-4222-8222-222222222222`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isActive: false })
      }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      patient: { status: string };
    };
    assert.equal(body.patient.status, "inactivo");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["patient_status_updated"]
  );
});

test("admin creates a patient and the creation is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "panel-test"
      },
      body: JSON.stringify({
        fullName: "Paciente Nuevo",
        whatsappPhone: "5215512345678",
        birthdate: "1992-05-10",
        preferredModality: "online",
        therapistId: "11111111-1111-4111-8111-111111111111"
      })
    });
    assert.equal(response.status, 201);
    const body = (await response.json()) as {
      patient: {
        fullName: string;
        whatsappPhone: string;
        status: string;
        assignedTherapistId: string | null;
      };
    };
    assert.equal(body.patient.fullName, "Paciente Nuevo");
    assert.equal(
      body.patient.assignedTherapistId,
      "11111111-1111-4111-8111-111111111111"
    );
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["patient_created"]
  );
  assert.equal(events.audit[0].actorUserId, requestSession.user.id);
  assert.equal(events.audit[0].entityType, "patient");
  assert.equal(events.audit[0].result, "success");
  assert.equal(events.audit[0].requestId, "request-1");
  assert.equal(events.audit[0].userAgent, "panel-test");
});

test("admin cannot create a patient whose WhatsApp is already registered", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Paciente Duplicado",
        whatsappPhone: "5215599999999",
        birthdate: "1990-01-01"
      })
    });
    assert.equal(response.status, 409);
    const body = (await response.json()) as { code: string };
    assert.equal(body.code, "patient_already_exists");
  });

  assert.deepEqual(events.audit, []);
});

test("completing an appointment is audited", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const response = await fetch(
      `${baseUrl}/appointments/33333333-3333-4333-8333-333333333333/complete`,
      { method: "POST", headers: { "content-type": "application/json" } }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      appointment: { status: string; completedAt: string };
    };
    assert.equal(body.appointment.status, "completada");
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["appointment_completed"]
  );
});

test("admin endpoints list therapists, patients and appointments", async () => {
  const events = await withAdminServer(async (baseUrl) => {
    const therapists = await fetch(`${baseUrl}/therapists`);
    assert.equal(therapists.status, 200);
    assert.equal(
      ((await therapists.json()) as { therapists: unknown[] }).therapists
        .length,
      1
    );

    const patients = await fetch(`${baseUrl}/patients`);
    assert.equal(patients.status, 200);
    const patientList = (await patients.json()) as {
      patients: Array<Record<string, unknown>>;
    };
    assert.equal(patientList.patients.length, 1);
    assert.equal("notes" in patientList.patients[0], false);

    const appointments = await fetch(`${baseUrl}/appointments`);
    assert.equal(appointments.status, 200);
    assert.equal(
      ((await appointments.json()) as { appointments: unknown[] }).appointments
        .length,
      1
    );
  });

  assert.deepEqual(events.audit, []);
});

test("invalid admin payloads are rejected with a validation error", async () => {
  await withAdminServer(async (baseUrl) => {
    const create = await fetch(`${baseUrl}/therapists`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "" })
    });
    assert.equal(create.status, 400);
    const createBody = (await create.json()) as { code: string };
    assert.equal(createBody.code, "validation_error");

    const createMissingPhone = await fetch(`${baseUrl}/therapists`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Terapeuta Sin Teléfono" })
    });
    assert.equal(createMissingPhone.status, 400);
    assert.equal(
      ((await createMissingPhone.json()) as { code: string }).code,
      "validation_error"
    );

    const createPatient = await fetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fullName: "Sin Teléfono" })
    });
    assert.equal(createPatient.status, 400);
    assert.equal(
      ((await createPatient.json()) as { code: string }).code,
      "validation_error"
    );

    const createPatientBadTherapist = await fetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Paciente Nuevo",
        whatsappPhone: "5215512345678",
        birthdate: "1992-05-10",
        therapistId: "not-a-uuid"
      })
    });
    assert.equal(createPatientBadTherapist.status, 400);
    assert.equal(
      ((await createPatientBadTherapist.json()) as { code: string }).code,
      "validation_error"
    );

    const createPatientWithNotes = await fetch(`${baseUrl}/patients`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fullName: "Paciente Nuevo",
        whatsappPhone: "5215512345678",
        birthdate: "1992-05-10",
        notes: "obsolete"
      })
    });
    assert.equal(createPatientWithNotes.status, 400);
    assert.equal(
      ((await createPatientWithNotes.json()) as { code: string }).code,
      "validation_error"
    );

    const assign = await fetch(
      `${baseUrl}/patients/22222222-2222-4222-8222-222222222222/therapist`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ therapistId: "not-a-uuid" })
      }
    );
    assert.equal(assign.status, 400);

    const badTherapistPath = await fetch(`${baseUrl}/therapists/not-a-uuid`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ isActive: false })
    });
    assert.equal(badTherapistPath.status, 400);
    assert.equal(
      ((await badTherapistPath.json()) as { code: string }).code,
      "validation_error"
    );

    const badAppointmentPath = await fetch(
      `${baseUrl}/appointments/not-a-uuid/complete`,
      { method: "POST", headers: { "content-type": "application/json" } }
    );
    assert.equal(badAppointmentPath.status, 400);
    assert.equal(
      ((await badAppointmentPath.json()) as { code: string }).code,
      "validation_error"
    );
  });
});
