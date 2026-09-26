import assert from "node:assert/strict";
import test from "node:test";

import { env } from "../../src/config/env.js";
import { dispatchDueReminders } from "../../src/modules/reminders/reminder-dispatcher.js";

const dueReminder = (
  id: string,
  recipient: "paciente" | "grupo_psicologas"
) => ({
  id,
  reminderType: "cancelacion" as const,
  recipient,
  attemptsCount: 0,
  appointment: {
    scheduledAt: new Date("2026-10-01T15:00:00.000Z"),
    modality: "online" as const,
    therapyType: "individual" as const,
    durationMinutes: 60,
    status: "cancelada",
    patient: { whatsappPhone: "5215550000000" },
    payments: []
  }
});

test("the dispatcher recovers stale claims and continues after a recipient send fails", async () => {
  const sent: string[] = [];
  let recoveredAt: Date | undefined;
  const now = new Date("2026-10-01T18:05:00.000Z");

  await dispatchDueReminders({
    now,
    dependencies: {
      recoverStaleClaims: async (value) => {
        recoveredAt = value;
      },
      findDueReminders: async () =>
        [
          dueReminder("first", "paciente"),
          dueReminder("second", "paciente")
        ] as never,
      sendReminder: async ({ reminderId }) => {
        sent.push(reminderId);
        if (reminderId === "first") {
          throw new Error("provider unavailable");
        }
        return { messageId: "wamid.second" };
      }
    }
  });

  assert.equal(recoveredAt, now);
  assert.deepEqual(sent, ["first", "second"]);
});

test("a missing group destination is recorded as a bounded recipient failure", async () => {
  const originalGroupDestination = env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID;
  const failures: Array<{ reminderId: string; attemptsCount?: number }> = [];
  env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = undefined;

  try {
    await dispatchDueReminders({
      now: new Date("2026-10-01T18:05:00.000Z"),
      dependencies: {
        recoverStaleClaims: async () => {},
        findDueReminders: async () =>
          [
            { ...dueReminder("group", "grupo_psicologas"), attemptsCount: 2 }
          ] as never,
        failReminder: async (input) => {
          failures.push({
            reminderId: input.reminderId,
            attemptsCount: input.attemptsCount
          });
          return { count: 1 } as never;
        },
        sendReminder: async () => {
          throw new Error("group destination should not be sent");
        }
      }
    });
  } finally {
    env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID = originalGroupDestination;
  }

  assert.deepEqual(failures, [{ reminderId: "group", attemptsCount: 2 }]);
});
