import assert from "node:assert/strict";
import test from "node:test";
import { randomInt, randomUUID } from "node:crypto";

import { prisma } from "../../src/lib/prisma.js";
import { createWhatsAppAppointment } from "../../src/modules/appointments/appointments.service.js";
import { rescheduleAppointmentWithAudit } from "../../src/modules/appointments/appointments.service.js";
import { previousDayReminderAt } from "../../src/modules/reminders/reminders.service.js";
import { dispatchDueReminders } from "../../src/modules/reminders/reminder-dispatcher.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

type Created = {
  users: string[];
  patients: string[];
  appointments: string[];
  phones: string[];
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
    await prisma.chatMessage.deleteMany({
      where: { conversation: { whatsappPhone: { in: created.phones } } }
    });
    await prisma.chatConversation.deleteMany({
      where: { whatsappPhone: { in: created.phones } }
    });
    await prisma.patient.deleteMany({
      where: { id: { in: created.patients } }
    });
    await prisma.therapistProfile.deleteMany({
      where: { userId: { in: created.users } }
    });
    await prisma.auditLog.deleteMany({
      where: {
        entityId: { in: [...created.patients, ...created.appointments] }
      }
    });
    await prisma.user.deleteMany({
      where: { id: { in: created.users } }
    });
    await prisma.$disconnect();
  });
};

const createTherapist = async (created: Created) => {
  const user = await prisma.user.create({
    data: {
      email: `psico-${randomUUID()}@directory.local`,
      fullName: "Terapeuta Perfil",
      role: "psicologo",
      panelLoginEnabled: false
    }
  });
  created.users.push(user.id);
  const therapist = await prisma.therapistProfile.create({
    data: { userId: user.id, phone: "5215500000000" }
  });
  return therapist;
};

const createBookingPatient = async (created: Created, therapistId: string) => {
  const user = await prisma.user.create({
    data: {
      email: `pac-${randomUUID()}@directory.local`,
      fullName: "Paciente Reserva",
      role: "paciente",
      panelLoginEnabled: false
    }
  });
  created.users.push(user.id);
  const phone = `52155${randomInt(10000000, 99999999)}`;
  created.phones.push(phone);
  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      fullName: "Paciente Reserva",
      whatsappPhone: phone,
      birthdate: new Date("1992-04-12T00:00:00.000Z"),
      status: "activo",
      assignedTherapistId: therapistId
    }
  });
  created.patients.push(patient.id);
  return patient;
};

const installAuditFailureTrigger = () =>
  prisma.$transaction([
    prisma.$executeRawUnsafe(
      "CREATE FUNCTION fail_audit_insert() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'forced audit failure'; END; $$ LANGUAGE plpgsql"
    ),
    prisma.$executeRawUnsafe(
      'CREATE TRIGGER "audit_logs_fail_insert" BEFORE INSERT ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION fail_audit_insert()'
    )
  ]);

test(
  "a failed audit insert rolls back the WhatsApp appointment creation",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      phones: []
    };
    registerCleanup(t, created);

    const therapist = await createTherapist(created);
    const patient = await createBookingPatient(created, therapist.id);
    await installAuditFailureTrigger();

    await assert.rejects(
      createWhatsAppAppointment({
        patient: {
          fullName: patient.fullName,
          whatsappPhone: patient.whatsappPhone,
          birthdate: patient.birthdate
        },
        scheduledAt: new Date("2026-10-05T15:00:00.000Z"),
        modality: "presencial",
        therapyType: "individual",
        createdVia: "whatsapp",
        audit: {
          actorChannel: "whatsapp",
          action: "appointment_created",
          entityType: "appointment",
          result: "success",
          metadata: { createdVia: "whatsapp" },
          ipAddress: undefined,
          userAgent: undefined,
          actorUserId: undefined,
          patientId: undefined
        }
      }),
      /forced audit failure/
    );

    const remaining = await prisma.appointment.count({
      where: { patientId: patient.id }
    });
    assert.equal(remaining, 0);
  }
);

test(
  "WhatsApp booking schedules all reminder rows atomically with the appointment",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      phones: []
    };
    registerCleanup(t, created);

    const therapist = await createTherapist(created);
    const patient = await createBookingPatient(created, therapist.id);
    const scheduledAt = new Date("2026-10-05T15:00:00.000Z");

    const { appointment } = await createWhatsAppAppointment({
      patient: {
        fullName: patient.fullName,
        whatsappPhone: patient.whatsappPhone,
        birthdate: patient.birthdate
      },
      scheduledAt,
      modality: "presencial",
      therapyType: "individual",
      createdVia: "whatsapp",
      audit: {
        actorChannel: "whatsapp",
        action: "appointment_created",
        entityType: "appointment",
        result: "success",
        metadata: { createdVia: "whatsapp" },
        ipAddress: undefined,
        userAgent: undefined,
        actorUserId: undefined,
        patientId: undefined
      }
    });
    created.appointments.push(appointment.id);

    const rows = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id }
    });
    const byKey = Object.fromEntries(
      rows.map((row) => [`${row.reminderType}:${row.recipient}`, row])
    );

    assert.deepEqual(
      [
        "confirmacion:paciente",
        "confirmacion:grupo_psicologas",
        "recordatorio_24h:paciente",
        "recordatorio_24h:grupo_psicologas",
        "pago_pendiente:paciente"
      ].every((key) => byKey[key] !== undefined),
      true
    );
    assert.equal(rows.length, 5);
    assert.equal(
      byKey["recordatorio_24h:paciente"].scheduledAt.getTime(),
      previousDayReminderAt(scheduledAt).getTime()
    );
    assert.equal(byKey["recordatorio_24h:paciente"].status, "pendiente");
  }
);

test(
  "cancellation notices are dispatched and stale reminders are omitted",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      phones: []
    };
    registerCleanup(t, created);

    const therapist = await createTherapist(created);
    const patient = await createBookingPatient(created, therapist.id);
    const at = new Date("2026-10-06T18:05:00.000Z");
    const previousDay = previousDayReminderAt(at);

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        therapistId: therapist.id,
        scheduledAt: at,
        endsAt: new Date(at.getTime() + 60 * 60_000),
        durationMinutes: 60,
        therapyType: "individual",
        modality: "online",
        isManualException: false,
        createdVia: "system",
        status: "cancelada",
        cancelledAt: new Date("2026-10-06T18:00:00.000Z")
      }
    });
    created.appointments.push(appointment.id);

    await prisma.appointmentReminder.createMany({
      data: [
        {
          appointmentId: appointment.id,
          reminderType: "cancelacion",
          recipient: "paciente",
          scheduledAt: new Date("2026-10-06T18:00:00.000Z"),
          status: "pendiente"
        },
        {
          appointmentId: appointment.id,
          reminderType: "recordatorio_24h",
          recipient: "paciente",
          scheduledAt: previousDay,
          status: "pendiente"
        }
      ]
    });

    const sent: Array<{ to: string; text: string }> = [];
    await dispatchDueReminders({
      now: new Date("2026-10-06T18:05:00.000Z"),
      gateway: {
        sendText: async (input) => {
          sent.push({ to: input.to, text: input.text });
          return { messageId: "wamid.reg" };
        }
      }
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, patient.whatsappPhone);
    assert.match(sent[0].text, /cancelada/);
    assert.match(sent[0].text, /reagendar/);

    const rows = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id }
    });
    const byType = Object.fromEntries(
      rows.map((row) => [row.reminderType, row])
    );
    assert.equal(byType["cancelacion"].status, "enviado");
    assert.equal(byType["recordatorio_24h"].status, "omitido");
  }
);

test(
  "rescheduling an appointment realigns prior-day reminders transactionally",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      phones: []
    };
    registerCleanup(t, created);

    const therapist = await createTherapist(created);
    const patient = await createBookingPatient(created, therapist.id);
    const from = new Date("2026-10-05T15:00:00.000Z");
    const to = new Date("2026-10-12T15:00:00.000Z");

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        therapistId: therapist.id,
        scheduledAt: from,
        endsAt: new Date(from.getTime() + 60 * 60_000),
        durationMinutes: 60,
        therapyType: "individual",
        modality: "online",
        isManualException: false,
        createdVia: "panel",
        status: "confirmada"
      }
    });
    created.appointments.push(appointment.id);

    const staleAt = previousDayReminderAt(from);
    await prisma.appointmentReminder.createMany({
      data: ["recordatorio_24h", "pago_pendiente"].map((reminderType) => ({
        appointmentId: appointment.id,
        reminderType,
        recipient: "paciente",
        scheduledAt: staleAt,
        status: "enviado",
        attemptsCount: 1,
        sentAt: new Date("2026-10-04T18:05:00.000Z"),
        providerMessageId: "wamid.stale"
      }))
    });

    await rescheduleAppointmentWithAudit({
      appointmentId: appointment.id,
      scheduledAt: to,
      audit: {
        actorUserId: created.users[0],
        actorChannel: "admin_panel",
        action: "appointment_rescheduled",
        entityType: "appointment",
        result: "success"
      }
    });

    const rows = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id }
    });
    assert.equal(rows.length, 2);
    const expected = previousDayReminderAt(to).getTime();
    for (const row of rows) {
      assert.equal(row.scheduledAt.getTime(), expected);
      assert.equal(row.status, "pendiente");
      assert.equal(row.attemptsCount, 0);
      assert.equal(row.sentAt, null);
      assert.equal(row.providerMessageId, null);
      assert.equal(row.lastError, null);
    }

    const updated = await prisma.appointment.findUniqueOrThrow({
      where: { id: appointment.id }
    });
    assert.equal(updated.scheduledAt.getTime(), to.getTime());
  }
);
