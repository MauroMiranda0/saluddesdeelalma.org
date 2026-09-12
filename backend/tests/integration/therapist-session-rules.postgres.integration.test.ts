import assert from "node:assert/strict";
import test from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { prisma } from "../../src/lib/prisma.js";
import { completeAppointmentWithAudit } from "../../src/modules/appointments/appointments.service.js";
import { scheduleAppointmentReminders } from "../../src/modules/reminders/reminders.service.js";
import {
  assignPatientTherapistWithAudit,
  setClinicalProfileActiveWithAudit
} from "../../src/modules/therapists/therapists.service.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

type Created = {
  users: string[];
  patients: string[];
  appointments: string[];
};

const registerCleanup = (t: test.TestContext, created: Created) => {
  t.after(async () => {
    await prisma.$executeRawUnsafe(
      'DROP TRIGGER IF EXISTS "audit_logs_fail_insert" ON "audit_logs"'
    );
    await prisma.$executeRawUnsafe(
      "DROP FUNCTION IF EXISTS fail_audit_insert()"
    );
    await prisma.appointmentReminder.deleteMany({
      where: { appointmentId: { in: created.appointments } }
    });
    await prisma.payment.deleteMany({
      where: { appointmentId: { in: created.appointments } }
    });
    await prisma.appointment.deleteMany({
      where: { id: { in: created.appointments } }
    });
    await prisma.patient.deleteMany({
      where: { id: { in: created.patients } }
    });
    await prisma.therapistProfile.deleteMany({
      where: { userId: { in: created.users } }
    });
    await prisma.auditLog.deleteMany({
      where: { actorUserId: { in: created.users } }
    });
    await prisma.user.deleteMany({
      where: { id: { in: created.users } }
    });
    await prisma.$disconnect();
  });
};

const createPsychologistUser = async (fullName: string) => {
  return prisma.user.create({
    data: {
      email: `psico-${randomUUID()}@directory.local`,
      fullName,
      role: "psicologo",
      panelLoginEnabled: false
    }
  });
};

const createPatient = async (
  fullName: string,
  created: Created,
  assignedTherapistId: string | null
) => {
  const user = await prisma.user.create({
    data: {
      email: `pac-${randomUUID()}@directory.local`,
      fullName,
      role: "paciente",
      panelLoginEnabled: false
    }
  });
  created.users.push(user.id);
  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      fullName,
      whatsappPhone: `52155${randomInt(10000000, 99999999)}`,
      birthdate: new Date("1995-05-05T00:00:00.000Z"),
      status: "activo",
      assignedTherapistId
    }
  });
  created.patients.push(patient.id);
  return patient;
};

const createAppointment = (input: {
  patientId: string;
  therapistId: string;
  scheduledAt: Date;
  status?: "programada" | "confirmada";
}) =>
  prisma.appointment.create({
    data: {
      patientId: input.patientId,
      therapistId: input.therapistId,
      scheduledAt: input.scheduledAt,
      endsAt: new Date(input.scheduledAt.getTime() + 60 * 60_000),
      durationMinutes: 60,
      therapyType: "individual",
      modality: "online",
      isManualException: false,
      createdVia: "system",
      status: input.status ?? "programada"
    }
  });

const auditFor = (actorUserId: string) => ({
  actorUserId,
  actorChannel: "admin_panel" as const,
  action: "test",
  entityType: "therapist_profile" as const,
  result: "success" as const
});

test(
  "interval exclusion blocks overlapping active appointments and releases completed slots",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistUser = await createPsychologistUser("Terapeuta Uno");
    created.users.push(therapistUser.id);
    const therapist = await prisma.therapistProfile.create({
      data: { userId: therapistUser.id }
    });
    const patient = await createPatient("Paciente Uno", created, therapist.id);

    const start = new Date("2026-10-05T15:00:00.000Z");
    const booked = await createAppointment({
      patientId: patient.id,
      therapistId: therapist.id,
      scheduledAt: start,
      status: "confirmada"
    });
    created.appointments.push(booked.id);

    await assert.rejects(
      createAppointment({
        patientId: patient.id,
        therapistId: therapist.id,
        scheduledAt: new Date("2026-10-05T15:30:00.000Z"),
        status: "confirmada"
      }),
      /exclusion constraint|appointments_active_therapist_interval_excl/i
    );

    const backToBack = await createAppointment({
      patientId: patient.id,
      therapistId: therapist.id,
      scheduledAt: new Date("2026-10-05T16:00:00.000Z"),
      status: "confirmada"
    });
    created.appointments.push(backToBack.id);

    await prisma.appointment.update({
      where: { id: booked.id },
      data: { status: "completada", completedAt: new Date() }
    });
    const freed = await createAppointment({
      patientId: patient.id,
      therapistId: therapist.id,
      scheduledAt: start,
      status: "programada"
    });
    created.appointments.push(freed.id);
  }
);

test(
  "an appointment therapist must be the patient assigned active therapist",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser("Terapeuta A");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const therapistBUser = await createPsychologistUser("Terapeuta B");
    created.users.push(therapistBUser.id);
    const therapistB = await prisma.therapistProfile.create({
      data: { userId: therapistBUser.id }
    });
    const patient = await createPatient("Paciente Dos", created, therapistA.id);

    await assert.rejects(
      createAppointment({
        patientId: patient.id,
        therapistId: therapistB.id,
        scheduledAt: new Date("2026-10-05T15:00:00.000Z")
      }),
      /appointment therapist must be the patient assigned active therapist/
    );

    const assigned = await assignPatientTherapistWithAudit({
      patientId: patient.id,
      therapistId: therapistB.id,
      audit: auditFor(therapistBUser.id)
    });
    assert.equal(assigned.assignedTherapistId, therapistB.id);

    await createAppointment({
      patientId: patient.id,
      therapistId: therapistB.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    }).then((appointment) => created.appointments.push(appointment.id));
  }
);

test(
  "appointments without an assigned active therapist are rejected",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const patientUser = await prisma.user.create({
      data: {
        email: `pac-${randomUUID()}@directory.local`,
        fullName: "Paciente Sin Terapeuta",
        role: "paciente",
        panelLoginEnabled: false
      }
    });
    created.users.push(patientUser.id);
    const patient = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        fullName: "Paciente Sin Terapeuta",
        whatsappPhone: `52155${randomInt(10000000, 99999999)}`,
        birthdate: new Date("1990-01-01T00:00:00.000Z"),
        status: "activo",
        assignedTherapistId: null
      }
    });
    created.patients.push(patient.id);

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "appointments"
          ("patient_id", "scheduled_at", "ends_at", "duration_minutes",
           "therapy_type", "modality", "is_manual_exception", "created_via", "status")
        VALUES (${patient.id}::uuid, '2026-11-02 17:00:00+00', '2026-11-02 18:00:00+00',
                60, 'individual', 'online', false, 'system', 'programada')
      `,
      /appointment requires an assigned active therapist/
    );

    const count = await prisma.appointment.count({
      where: { patientId: patient.id }
    });
    assert.equal(count, 0);
  }
);

test(
  "inactive therapists reject new appointments while history is conserved",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser("Terapeuta Inactivo");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Tres",
      created,
      therapistA.id
    );

    const historical = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    });
    created.appointments.push(historical.id);

    await setClinicalProfileActiveWithAudit({
      therapistId: therapistA.id,
      isActive: false,
      audit: auditFor(therapistAUser.id)
    });

    await assert.rejects(
      createAppointment({
        patientId: patient.id,
        therapistId: therapistA.id,
        scheduledAt: new Date("2026-10-05T16:00:00.000Z")
      }),
      /appointment therapist must be the patient assigned active therapist/
    );

    const stillAssigned = await prisma.patient.findUniqueOrThrow({
      where: { id: patient.id },
      select: { assignedTherapistId: true }
    });
    assert.equal(stillAssigned.assignedTherapistId, therapistA.id);

    const historicalStillThere = await prisma.appointment.findUniqueOrThrow({
      where: { id: historical.id },
      select: { therapistId: true, status: true }
    });
    assert.equal(historicalStillThere.therapistId, therapistA.id);
  }
);

test(
  "a therapist profile requires an admin or psychologist user",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const patientUser = await prisma.user.create({
      data: {
        email: `pac-${randomUUID()}@directory.local`,
        fullName: "Paciente Cuatro",
        role: "paciente",
        panelLoginEnabled: false
      }
    });
    created.users.push(patientUser.id);

    const therapistAUser = await createPsychologistUser("Validador");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Cuatro",
      created,
      therapistA.id
    );

    const user = await prisma.user.create({
      data: {
        email: `reg-${randomUUID()}@directory.local`,
        fullName: "Paciente Registro",
        role: "paciente",
        panelLoginEnabled: false
      }
    });
    created.users.push(user.id);

    await assert.rejects(
      prisma.therapistProfile.create({ data: { userId: user.id } }),
      /therapist profile requires an admin or psychologist user/
    );

    const count = await prisma.therapistProfile.count({
      where: { id: patient.id }
    });
    assert.equal(count, 0);
  }
);

test(
  "reminder scheduling is idempotent for patient and group destinations",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser(
      "Terapeuta Recordatorios"
    );
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Cinco",
      created,
      therapistA.id
    );
    const appointment = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date(Date.now() + 48 * 60 * 60_000)
    });
    created.appointments.push(appointment.id);

    await scheduleAppointmentReminders(appointment);
    await scheduleAppointmentReminders(appointment);

    const rows = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id }
    });
    const key = (row: { reminderType: string; recipient: string }) =>
      `${row.reminderType}:${row.recipient}`;
    const counts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[key(row)] = (acc[key(row)] ?? 0) + 1;
      return acc;
    }, {});

    assert.equal(counts["recordatorio_24h:paciente"], 1);
    assert.equal(counts["recordatorio_24h:grupo_psicologas"], 1);
    assert.equal(counts["pago_pendiente:paciente"], 1);
    assert.equal(counts["pago_pendiente:grupo_psicologas"], undefined);
    assert.equal(
      counts["pago_pendiente_post_cita:grupo_psicologas"],
      undefined
    );
  }
);

test(
  "the post-completion payment notice targets the patient once",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser("Terapeuta Post Cita");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Seis",
      created,
      therapistA.id
    );
    const appointment = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    });
    created.appointments.push(appointment.id);

    await completeAppointmentWithAudit({
      appointmentId: appointment.id,
      audit: auditFor(therapistAUser.id)
    });
    await completeAppointmentWithAudit({
      appointmentId: appointment.id,
      audit: auditFor(therapistAUser.id)
    });

    const rows = await prisma.appointmentReminder.findMany({
      where: {
        appointmentId: appointment.id,
        reminderType: "pago_pendiente_post_cita"
      }
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].recipient, "paciente");
  }
);

test(
  "payment reminders are suppressed when a validated full payment exists",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser("Terapeuta Pagos");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Siete",
      created,
      therapistA.id
    );
    const appointment = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    });
    created.appointments.push(appointment.id);

    await prisma.payment.create({
      data: {
        appointmentId: appointment.id,
        patientId: patient.id,
        paymentType: "completo",
        amount: 60,
        method: "transferencia",
        status: "validado",
        recordedByUserId: therapistAUser.id,
        paidAt: new Date()
      }
    });

    await completeAppointmentWithAudit({
      appointmentId: appointment.id,
      audit: auditFor(therapistAUser.id)
    });

    const rows = await prisma.appointmentReminder.findMany({
      where: {
        appointmentId: appointment.id,
        reminderType: "pago_pendiente_post_cita"
      }
    });
    assert.equal(rows.length, 0);
  }
);

test(
  "completing an appointment rolls back when its audit insert fails",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const therapistAUser = await createPsychologistUser("Terapeuta Rollback");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Ocho",
      created,
      therapistA.id
    );
    const appointment = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    });
    created.appointments.push(appointment.id);

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION fail_audit_insert() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced audit failure';
      END;
      $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "audit_logs_fail_insert"
      BEFORE INSERT ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION fail_audit_insert()
    `);

    await assert.rejects(
      completeAppointmentWithAudit({
        appointmentId: appointment.id,
        audit: auditFor(therapistAUser.id)
      }),
      /forced audit failure/
    );

    const unchanged = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id }
    });
    assert.equal(unchanged.status, "programada");
    assert.equal(unchanged.completedAt, null);

    const reminders = await prisma.appointmentReminder.count({
      where: { appointmentId: appointment.id }
    });
    assert.equal(reminders, 0);
  }
);

test(
  "the recipient enum migrated from admin to grupo_psicologas",
  { skip: !enabled },
  async (t) => {
    const created: Created = { users: [], patients: [], appointments: [] };
    registerCleanup(t, created);

    const enumValues = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
      SELECT e.enumlabel
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'ReminderRecipient'
      ORDER BY e.enumsortorder;
    `;
    assert.deepEqual(enumValues.map((value) => value.enumlabel).sort(), [
      "grupo_psicologas",
      "paciente"
    ]);

    const therapistAUser = await createPsychologistUser("Terapeuta Grupos");
    created.users.push(therapistAUser.id);
    const therapistA = await prisma.therapistProfile.create({
      data: { userId: therapistAUser.id }
    });
    const patient = await createPatient(
      "Paciente Nueve",
      created,
      therapistA.id
    );
    const appointment = await createAppointment({
      patientId: patient.id,
      therapistId: therapistA.id,
      scheduledAt: new Date("2026-10-05T15:00:00.000Z")
    });
    created.appointments.push(appointment.id);

    await assert.rejects(
      prisma.$executeRaw`
        INSERT INTO "appointment_reminders"
          ("appointment_id", "reminder_type", "recipient", "scheduled_at")
        VALUES (${appointment.id}::uuid, 'pago_pendiente', 'admin', now());
      `,
      /invalid input value for enum "ReminderRecipient"/
    );
  }
);
