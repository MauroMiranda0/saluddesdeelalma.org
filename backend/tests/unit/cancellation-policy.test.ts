import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelAppointmentWithAudit,
  cancellationNoticeFor
} from "../../src/modules/appointments/appointments.service.js";

const scheduledAt = new Date("2026-09-15T16:00:00.000Z");

test("a cancellation exactly 24 hours before the session is timely", () => {
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-14T16:00:00.000Z")),
    "a_tiempo"
  );
});

test("a cancellation one millisecond after the 24-hour boundary is late", () => {
  assert.equal(
    cancellationNoticeFor(scheduledAt, new Date("2026-09-14T16:00:00.001Z")),
    "tardia"
  );
});

test("cancelling an appointment does not create an automatic payment", async () => {
  const current = {
    id: "33333333-3333-4333-8333-333333333333",
    scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60_000),
    status: "confirmada" as const
  };
  const updateCalls: Array<{ data: Record<string, unknown> }> = [];
  const reminderCalls: unknown[] = [];
  const auditCalls: Array<{ data: Record<string, unknown> }> = [];
  let automaticPaymentCreates = 0;
  const cancelled = {
    ...current,
    status: "cancelada" as const,
    cancelReason: "Cambio de planes",
    cancelledAt: new Date(),
    cancellationNotice: "a_tiempo" as const,
    patient: {
      id: "44444444-4444-4444-8444-444444444444",
      fullName: "Paciente Prueba",
      whatsappPhone: "5215500000000",
      birthdate: new Date("1990-01-01T00:00:00.000Z")
    },
    therapist: null
  };
  const transaction = {
    appointment: {
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updateCalls.push({ data });
        return { ...cancelled, ...data };
      }
    },
    appointmentReminder: {
      upsert: async (input: unknown) => {
        reminderCalls.push(input);
        return { id: "55555555-5555-4555-8555-555555555555" };
      }
    },
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        auditCalls.push({ data });
        return { id: "66666666-6666-4666-8666-666666666666" };
      }
    },
    payment: {
      create: async () => {
        automaticPaymentCreates += 1;
        return { id: "77777777-7777-4777-8777-777777777777" };
      }
    }
  };

  const result = await cancelAppointmentWithAudit(
    {
      appointmentId: current.id,
      reason: "Cambio de planes",
      audit: {
        actorChannel: "admin_panel",
        action: "appointment_cancelled",
        entityType: "appointment",
        result: "success"
      }
    },
    {
      findAppointment: async () => current,
      transaction: async (
        callback: (value: typeof transaction) => Promise<typeof cancelled>
      ) => callback(transaction)
    } as never
  );

  assert.equal(result.status, "cancelada");
  assert.equal(result.cancellationNotice, "a_tiempo");
  assert.equal(updateCalls[0].data.cancellationNotice, "a_tiempo");
  assert.equal(reminderCalls.length, 1);
  assert.equal(auditCalls[0].data.action, "appointment_cancelled");
  assert.equal(automaticPaymentCreates, 0);
});
