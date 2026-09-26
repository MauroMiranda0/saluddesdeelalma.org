import { logger } from "../lib/logger";
import { dispatchDueReminders } from "../modules/reminders/reminder-dispatcher";

const INTERVAL_MS = 5 * 60_000;

const run = async () => {
  try {
    await dispatchDueReminders();
  } catch (error) {
    logger.error({ error }, "Reminder dispatch failed");
  }
};

export const startReminderWorker = () => {
  let running = false;

  const runWithoutOverlap = async () => {
    if (running) {
      return;
    }

    running = true;
    try {
      await run();
    } finally {
      running = false;
    }
  };

  void runWithoutOverlap();
  return setInterval(() => void runWithoutOverlap(), INTERVAL_MS);
};
