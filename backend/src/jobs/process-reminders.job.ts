import { logger } from "../lib/logger";
import { dispatchDueReminders } from "../modules/reminders/reminder-dispatcher";

const run = async () => {
  try {
    await dispatchDueReminders();
  } catch (error) {
    logger.error({ error }, "Reminder dispatch failed");
  }
};

void run();
setInterval(() => void run(), 5 * 60_000);
