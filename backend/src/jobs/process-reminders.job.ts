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
  void run();
  setInterval(() => void run(), INTERVAL_MS);
};
