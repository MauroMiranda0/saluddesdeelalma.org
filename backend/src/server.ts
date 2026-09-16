import { app } from "./app";
import { env } from "./config/env";
import { startReminderWorker } from "./jobs/process-reminders.job";
import { startWhatsAppInboxWorker } from "./jobs/process-whatsapp-inbox.job";
import { logger } from "./lib/logger";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Backend server started");
});

if (env.ENABLE_REMINDER_WORKER === "true") {
  startReminderWorker();
  logger.info("Reminder worker started");
}

if (env.ENABLE_WHATSAPP_INBOX_WORKER === "true") {
  startWhatsAppInboxWorker();
  logger.info("WhatsApp inbox worker started");
}

const shutdown = (signal: NodeJS.Signals) => {
  logger.info({ signal }, "Shutting down backend server");
  server.close((error) => {
    if (error) {
      logger.error({ error }, "Error while shutting down backend server");
      process.exit(1);
    }

    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
