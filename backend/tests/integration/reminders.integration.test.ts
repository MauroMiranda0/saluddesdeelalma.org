import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import test from "node:test";

import { env } from "../../src/config/env.js";
import { prisma } from "../../src/lib/prisma.js";
import { dispatchDueReminders } from "../../src/modules/reminders/reminder-dispatcher.js";
import {
  createPostCompletionPaymentReminder,
  markQueuedReminderSent,
  previousDayReminderAt,
  scheduleAppointmentReminders,
  schedulePriorDayPaymentReminder
} from "../../src/modules/reminders/reminders.service.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

type Created = {
  users: string[];
  patients: string[];
  appointments: string[];
  reminders: string[];
};

const registerCleanup = (t: test.TestContext, created: Created) => {
  t.after(async () => {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: created.reminders } }
    });
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
    await prisma.user.deleteMany({
      where: { id: { in: created.users } }
    });
    await prisma.$disconnect();
  });
};

const createAppointment = async (created: Created, scheduledAt: Date) => {
  const therapistUser = await prisma.user.create({
    data: {
      email: `therapist-reminders-${randomUUID()}@integration.local`,
      fullName: "Terapeuta Recordatorios",
      role: "psicologo",
      panelLoginEnabled: false
    }
  });
  created.users.push(therapistUser.id);
  const therapist = await prisma.therapistProfile.create({
    data: {
      userId: therapistUser.id,
      phone: `52155${randomInt(10000000, 99999999)}`
    }
  });
  const patientUser = await prisma.user.create({
    data: {
      email: `patient-reminders-${randomUUID()}@integration.local`,
      fullName: "Paciente Recordatorios",
      role: "paciente",
      panelLoginEnabled: false
    }
  });
  created.users.push(patientUser.id);
  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      fullName: "Paciente Recordatorios",
      whatsappPhone: `52155${randomInt(10000000, 99999999)}`,
      birthdate: new Date("1990-01-01T00:00:00.000Z"),
      status: "activo",
      assignedTherapistId: therapist.id
    }
  });
  created.patients.push(patient.id);
  const appointment = await prisma.appointment.create({
    data: {
      patientId: patient.id,
      therapistId: therapist.id,
      scheduledAt,
      endsAt: new Date(scheduledAt.getTime() + 60 * 60_000),
      durationMinutes: 60,
      therapyType: "individual",
      modality: "online",
      isManualException: false,
      createdVia: "system",
      status: "confirmada"
    }
  });
  created.appointments.push(appointment.id);

  return { appointment, patient };
};

const dispatchOnly = async (input: {
  now: Date;
  reminderIds: string[];
  gateway: Parameters<typeof dispatchDueReminders>[0] extends {
    gateway?: infer Gateway;
  }
    ? Gateway
    : never;
}) =>
  dispatchDueReminders({
    now: input.now,
    gateway: input.gateway,
    dependencies: {
      findDueReminders: async () =>
        (await prisma.appointmentReminder.findMany({
          where: {
            id: { in: input.reminderIds },
            status: { in: ["pendiente", "fallido"] },
            scheduledAt: { lte: input.now },
            attemptsCount: { lt: 3 }
          },
          include: {
            appointment: {
              include: {
                patient: true,
                payments: {
                  where: { paymentType: "completo", status: "validado" }
                }
              }
            }
          }
        })) as never
    }
  });

test(
  "prior-day reminders dispatch independently to the patient and internal group",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const scheduledAt = new Date("2030-10-07T15:00:00.000Z");
    const now = new Date(
      previousDayReminderAt(scheduledAt).getTime() + 5 * 60_000
    );
    const { appointment, patient } = await createAppointment(
      created,
      scheduledAt
    );
    const reminders = await prisma.appointmentReminder.createManyAndReturn({
      data: ["paciente", "grupo_psicologas"].map((recipient) => ({
        appointmentId: appointment.id,
        reminderType: "recordatorio_24h",
        recipient,
        scheduledAt: previousDayReminderAt(scheduledAt)
      }))
    });
    created.reminders.push(...reminders.map((reminder) => reminder.id));
    const originalGroupDestination = env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID;
    const groupDestination = `group-reminders-${randomUUID()}`;
    env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = groupDestination;
    const deliveredTo: string[] = [];

    try {
      await dispatchOnly({
        now,
        reminderIds: created.reminders,
        gateway: {
          sendText: async ({ to }) => {
            deliveredTo.push(to);
            return { messageId: `wamid.prior-day.${to}` };
          }
        }
      });
    } finally {
      env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = originalGroupDestination;
    }

    assert.deepEqual(
      new Set(deliveredTo),
      new Set([patient.whatsappPhone, groupDestination])
    );
    const rows = await prisma.appointmentReminder.findMany({
      where: { id: { in: created.reminders } }
    });
    assert.equal(
      rows.every((row) => row.status === "enviado"),
      true
    );
    const sentAudits = await prisma.auditLog.count({
      where: {
        entityId: { in: created.reminders },
        action: "appointment_reminder_sent"
      }
    });
    assert.equal(sentAudits, 2);
  }
);

test(
  "a failed group recipient retries independently and records its three-attempt lifecycle",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const scheduledAt = new Date("2030-10-08T15:00:00.000Z");
    const now = new Date(
      previousDayReminderAt(scheduledAt).getTime() + 5 * 60_000
    );
    const { appointment, patient } = await createAppointment(
      created,
      scheduledAt
    );
    const reminders = await prisma.appointmentReminder.createManyAndReturn({
      data: ["paciente", "grupo_psicologas"].map((recipient) => ({
        appointmentId: appointment.id,
        reminderType: "recordatorio_24h",
        recipient,
        scheduledAt: previousDayReminderAt(scheduledAt)
      }))
    });
    created.reminders.push(...reminders.map((reminder) => reminder.id));
    const originalGroupDestination = env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID;
    const groupDestination = `group-retry-${randomUUID()}`;
    env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = groupDestination;
    const deliveries: string[] = [];

    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        await dispatchOnly({
          now,
          reminderIds: created.reminders,
          gateway: {
            sendText: async ({ to }) => {
              deliveries.push(to);
              if (to === groupDestination) {
                throw new Error("group provider unavailable");
              }
              return { messageId: "wamid.patient" };
            }
          }
        });
      }
    } finally {
      env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = originalGroupDestination;
    }

    const rows = await prisma.appointmentReminder.findMany({
      where: { id: { in: created.reminders } }
    });
    const byRecipient = Object.fromEntries(
      rows.map((row) => [row.recipient, row])
    );
    assert.equal(byRecipient.paciente.status, "enviado");
    assert.equal(byRecipient.paciente.attemptsCount, 0);
    assert.equal(byRecipient.grupo_psicologas.status, "fallido");
    assert.equal(byRecipient.grupo_psicologas.attemptsCount, 3);
    assert.equal(
      deliveries.filter((destination) => destination === patient.whatsappPhone)
        .length,
      1
    );
    assert.equal(
      deliveries.filter((destination) => destination === groupDestination)
        .length,
      3
    );

    const actions = await prisma.auditLog.findMany({
      where: { entityId: { in: created.reminders } },
      select: { action: true }
    });
    assert.equal(
      actions.filter((audit) => audit.action === "appointment_reminder_sent")
        .length,
      1
    );
    assert.equal(
      actions.filter((audit) => audit.action === "appointment_reminder_retry")
        .length,
      2
    );
    assert.equal(
      actions.filter((audit) => audit.action === "appointment_reminder_failed")
        .length,
      1
    );
  }
);

test(
  "concurrent worker runs claim a reminder atomically and send it once",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const now = new Date("2030-10-06T00:05:00.000Z");
    const { appointment } = await createAppointment(
      created,
      new Date("2030-10-07T15:00:00.000Z")
    );
    const reminder = await prisma.appointmentReminder.create({
      data: {
        appointmentId: appointment.id,
        reminderType: "cancelacion",
        recipient: "paciente",
        scheduledAt: now
      }
    });
    created.reminders.push(reminder.id);

    let arrivals = 0;
    let releaseQueries: () => void;
    const bothQueriesReady = new Promise<void>((resolve) => {
      releaseQueries = resolve;
    });
    let sends = 0;
    const dispatch = () =>
      dispatchDueReminders({
        now,
        gateway: {
          sendText: async () => {
            sends += 1;
            return { messageId: "wamid.claimed-once" };
          }
        },
        dependencies: {
          findDueReminders: async () => {
            const due = await prisma.appointmentReminder.findMany({
              where: { id: reminder.id },
              include: {
                appointment: {
                  include: {
                    patient: true,
                    payments: {
                      where: { paymentType: "completo", status: "validado" }
                    }
                  }
                }
              }
            });
            arrivals += 1;
            if (arrivals === 2) {
              releaseQueries();
            }
            await bothQueriesReady;
            return due as never;
          }
        }
      });

    await Promise.all([dispatch(), dispatch()]);

    assert.equal(sends, 1);
    const row = await prisma.appointmentReminder.findUniqueOrThrow({
      where: { id: reminder.id }
    });
    assert.equal(row.status, "enviado");
    assert.equal(row.attemptsCount, 0);
    assert.equal(
      await prisma.auditLog.count({
        where: { entityId: reminder.id, action: "appointment_reminder_sent" }
      }),
      1
    );
  }
);

test(
  "a reminder whose outbox message was already accepted is not sent again",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const now = new Date("2030-10-06T00:05:00.000Z");
    const { appointment } = await createAppointment(
      created,
      new Date("2030-10-07T15:00:00.000Z")
    );
    const reminder = await prisma.appointmentReminder.create({
      data: {
        appointmentId: appointment.id,
        reminderType: "cancelacion",
        recipient: "paciente",
        scheduledAt: now
      }
    });
    created.reminders.push(reminder.id);
    const incomingEvent = await prisma.incomingWhatsAppEvent.create({
      data: {
        waMessageId: `wamid.cancel-${randomUUID()}`,
        kind: "message",
        whatsappPhone: "5215550000000",
        receivedAt: now,
        payload: { text: "Quiero cancelar mi cita" }
      }
    });
    t.after(async () => {
      await prisma.outgoingWhatsAppEvent.deleteMany({
        where: { incomingEventId: incomingEvent.id }
      });
      await prisma.incomingWhatsAppEvent.delete({
        where: { id: incomingEvent.id }
      });
    });
    // The provider already accepted the inline cancellation confirmation while
    // the reminder row is still pending, which is the duplicate-send window.
    await prisma.outgoingWhatsAppEvent.create({
      data: {
        incomingEventId: incomingEvent.id,
        sequence: 0,
        whatsappPhone: "5215550000000",
        contentText: "Su cita fue cancelada.",
        status: "enviado",
        providerMessageId: "wamid.outbox-cancellation",
        sentAt: now,
        reminderId: reminder.id
      }
    });

    let sends = 0;
    await dispatchOnly({
      now,
      reminderIds: [reminder.id],
      gateway: {
        sendText: async () => {
          sends += 1;
          return { messageId: "wamid.duplicate" };
        }
      }
    });

    assert.equal(sends, 0, "the accepted outbox message fulfills the reminder");
    const row = await prisma.appointmentReminder.findUniqueOrThrow({
      where: { id: reminder.id }
    });
    assert.equal(row.status, "pendiente");
    assert.equal(row.attemptsCount, 0);
    assert.equal(
      await prisma.auditLog.count({
        where: { entityId: reminder.id, action: "appointment_reminder_sent" }
      }),
      0
    );

    await markQueuedReminderSent({
      reminderId: reminder.id,
      providerMessageId: "wamid.outbox-cancellation"
    });
    const settled = await prisma.appointmentReminder.findUniqueOrThrow({
      where: { id: reminder.id }
    });
    assert.equal(settled.status, "enviado");
    assert.equal(settled.providerMessageId, "wamid.outbox-cancellation");
    assert.equal(
      await prisma.auditLog.count({
        where: { entityId: reminder.id, action: "appointment_reminder_sent" }
      }),
      1
    );
  }
);

test(
  "reminders created after their window are omitted with one audit per recipient",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const { appointment } = await createAppointment(
      created,
      new Date(Date.now() + 60 * 60_000)
    );
    await scheduleAppointmentReminders(appointment);

    const rows = await prisma.appointmentReminder.findMany({
      where: { appointmentId: appointment.id }
    });
    created.reminders.push(...rows.map((row) => row.id));
    assert.equal(rows.length, 2);
    assert.equal(
      rows.every((row) => row.status === "omitido"),
      true
    );
    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: { in: rows.map((row) => row.id) },
          action: "appointment_reminder_omitted"
        }
      }),
      2
    );

    await scheduleAppointmentReminders(appointment);
    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: { in: rows.map((row) => row.id) },
          action: "appointment_reminder_omitted"
        }
      }),
      2
    );
  }
);

test(
  "a stale prior-day reminder is omitted with a recipient audit row",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const scheduledAt = new Date("2030-10-07T15:00:00.000Z");
    const { appointment } = await createAppointment(created, scheduledAt);
    const reminder = await prisma.appointmentReminder.create({
      data: {
        appointmentId: appointment.id,
        reminderType: "recordatorio_24h",
        recipient: "paciente",
        scheduledAt: previousDayReminderAt(scheduledAt)
      }
    });
    created.reminders.push(reminder.id);

    await dispatchOnly({
      now: new Date("2030-10-08T00:05:00.000Z"),
      reminderIds: [reminder.id],
      gateway: {
        sendText: async () => {
          throw new Error("stale reminder must not be sent");
        }
      }
    });

    const row = await prisma.appointmentReminder.findUniqueOrThrow({
      where: { id: reminder.id }
    });
    assert.equal(row.status, "omitido");
    assert.match(row.lastError ?? "", /Outside the prior-day reminder window/);
    const audit = await prisma.auditLog.findFirst({
      where: {
        entityId: reminder.id,
        action: "appointment_reminder_omitted"
      }
    });
    assert.equal(audit?.result, "success");
  }
);

test(
  "prior-day and post-session payment reminders remain patient-only when dispatched",
  { skip: !enabled },
  async (t) => {
    const created: Created = {
      users: [],
      patients: [],
      appointments: [],
      reminders: []
    };
    registerCleanup(t, created);

    const scheduledAt = new Date("2030-10-09T15:00:00.000Z");
    const now = new Date(
      previousDayReminderAt(scheduledAt).getTime() + 5 * 60_000
    );
    const { appointment, patient } = await createAppointment(
      created,
      scheduledAt
    );
    const priorDay = await schedulePriorDayPaymentReminder(appointment);
    const postSession = await createPostCompletionPaymentReminder(
      appointment.id
    );
    assert.ok(priorDay);
    assert.ok(postSession);
    created.reminders.push(priorDay.id, postSession.id);
    const deliveredTo: string[] = [];

    await dispatchOnly({
      now,
      reminderIds: created.reminders,
      gateway: {
        sendText: async ({ to }) => {
          deliveredTo.push(to);
          return { messageId: `wamid.payment.${deliveredTo.length}` };
        }
      }
    });

    const rows = await prisma.appointmentReminder.findMany({
      where: { id: { in: created.reminders } }
    });
    assert.deepEqual(
      new Set(rows.map((row) => row.reminderType)),
      new Set(["pago_pendiente", "pago_pendiente_post_cita"])
    );
    assert.equal(
      rows.every((row) => row.recipient === "paciente"),
      true
    );
    assert.equal(
      rows.every((row) => row.status === "enviado"),
      true
    );
    assert.deepEqual(deliveredTo, [
      patient.whatsappPhone,
      patient.whatsappPhone
    ]);
  }
);
