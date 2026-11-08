"use strict";

const http = require("node:http");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { createStagingProtection } = require("./staging-auth.cjs");

class StartupError extends Error {}

const isBackendPath = (url) => {
  const pathname = url.split("?", 1)[0];
  return (
    pathname === "/health" ||
    pathname === "/health/" ||
    pathname === "/api/v1" ||
    pathname.startsWith("/api/v1/")
  );
};

const createRequestHandler =
  (backend, frontend, onError) => (request, response) => {
    if (isBackendPath(request.url || "/")) {
      backend(request, response);
      return;
    }

    Promise.resolve()
      .then(() => frontend(request, response))
      .catch((error) => {
        onError(error);
        if (response.headersSent) {
          response.destroy();
        } else {
          response.writeHead(500, { "content-type": "text/plain" });
          response.end("Internal Server Error");
        }
      });
  };

const createProtectedHandler = (protectStaging, getHandler) =>
  (request, response) => {
    protectStaging(request, response, () => {
      const handler = getHandler();
      if (!handler) {
        response.writeHead(503, { "content-type": "text/plain" });
        response.end("Service unavailable");
        return;
      }
      handler(request, response);
    });
  };

const start = async () => {
  if (process.env.SHARED_PILOT_BUILD !== "true") {
    throw new StartupError("SHARED_PILOT_BUILD must be true for the shared pilot");
  }
  let protectStaging;
  try {
    protectStaging = createStagingProtection(
      process.env.STAGING_AUTH_USER,
      process.env.STAGING_AUTH_PASSWORD
    );
  } catch (error) {
    throw new StartupError(error.message);
  }
  if (process.env.ENV_FILE) {
    throw new StartupError("ENV_FILE is not supported by the shared pilot");
  }
  if (process.env.WHATSAPP_OUTBOUND_ENABLED !== "false") {
    throw new StartupError(
      'WHATSAPP_OUTBOUND_ENABLED must be "false" for the shared pilot'
    );
  }
  if (process.env.NEXT_PUBLIC_API_BASE_URL !== "/api/v1") {
    throw new StartupError(
      'NEXT_PUBLIC_API_BASE_URL must be "/api/v1" for the shared pilot'
    );
  }
  if (process.env.API_PREFIX !== "/api/v1") {
    throw new StartupError("API_PREFIX must be /api/v1 for the shared pilot");
  }
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new StartupError("PORT must be a valid platform-assigned port");
  }

  let handler;
  const server = http.createServer(
    createProtectedHandler(protectStaging, () => handler)
  );
  let logger;
  server.on("error", () => {
    if (logger) {
      logger.error({ event: "shared_server_error" }, "Shared server failed");
    } else {
      console.error("Shared pilot server failed to listen");
    }
    process.exitCode = 1;
  });
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error);
    server.once("error", onError);
    server.listen(port, "0.0.0.0", () => {
      server.removeListener("error", onError);
      resolve();
    });
  });

  let prisma;
  let nextApp;
  try {
    const { validateProductionEnvironment } = await import(
      pathToFileURL(
        path.join(__dirname, "backend/scripts/validate-production-env.mjs")
      ).href
    );
    if (
      validateProductionEnvironment([
        "--process-env",
        "--require-frontend-relative",
        "--require-whatsapp-outbound-disabled"
      ]) !== 0
    ) {
      throw new StartupError("Shared pilot preflight failed");
    }

    const next = require("next");
    const { app } = require("./backend/dist/app.js");
    ({ prisma } = require("./backend/dist/lib/prisma.js"));
    ({ logger } = require("./backend/dist/lib/logger.js"));
    nextApp = next({
      dev: false,
      dir: path.join(__dirname, "frontend"),
      hostname: "0.0.0.0",
      port
    });
    await nextApp.prepare();
    handler = createRequestHandler(app, nextApp.getRequestHandler(), () => {
      logger.error(
        { event: "shared_frontend_request_failed" },
        "Frontend request failed"
      );
    });
    logger.info({ port }, "Shared pilot server started");
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    throw error;
  }
  const shutdown = () => {
    server.close(async (error) => {
      try {
        await nextApp.close();
        await prisma.$disconnect();
      } catch {
        logger.error(
          { event: "shared_shutdown_failed" },
          "Shared shutdown failed"
        );
        process.exitCode = 1;
      }
      if (error) {
        logger.error(
          { event: "shared_shutdown_failed" },
          "Shared shutdown failed"
        );
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
};

module.exports = {
  createProtectedHandler,
  createRequestHandler,
  isBackendPath,
  start,
  StartupError
};
