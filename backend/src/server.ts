import { app } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "Backend server started");
});

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
