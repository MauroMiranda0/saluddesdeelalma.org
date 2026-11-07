"use strict";

const http = require("node:http");
const { existsSync } = require("node:fs");
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

const start = async () => {
  let protectStaging;
  try {
    protectStaging = createStagingProtection(
      process.env.STAGING_AUTH_USER,
      process.env.STAGING_AUTH_PASSWORD
    );
  } catch (error) {
    throw new StartupError(error.message);
  }
  const { validateProductionEnvironment } = await import(
    pathToFileURL(
      path.join(__dirname, "backend/scripts/validate-production-env.mjs")
    ).href
  );
  const preflight = validateProductionEnvironment([
    "--process-env",
    "--require-frontend-relative",
    "--require-whatsapp-outbound-disabled"
  ]);
  if (preflight !== 0) {
    throw new StartupError("Shared pilot preflight failed");
  }
  if (process.env.ENV_FILE) {
    throw new StartupError("ENV_FILE is not supported by the shared pilot");
  }
  for (const directory of [__dirname, path.join(__dirname, "frontend")]) {
    for (const name of [
      ".env",
      ".env.local",
      ".env.production",
      ".env.production.local"
    ]) {
      if (existsSync(path.join(directory, name))) {
        throw new StartupError(
          "Local environment files are not supported by the shared pilot"
        );
      }
    }
  }
  if (process.env.API_PREFIX !== "/api/v1") {
    throw new StartupError("API_PREFIX must be /api/v1 for the shared pilot");
  }
  const port = Number(process.env.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new StartupError("PORT must be a valid platform-assigned port");
  }

  const next = require("next");
  const { app } = require("./backend/dist/app.js");
  const { prisma } = require("./backend/dist/lib/prisma.js");
  const { logger } = require("./backend/dist/lib/logger.js");
  const nextApp = next({
    dev: false,
    dir: path.join(__dirname, "frontend"),
    hostname: "0.0.0.0",
    port
  });
  await nextApp.prepare();

  const handler = createRequestHandler(app, nextApp.getRequestHandler(), () => {
    logger.error(
      { event: "shared_frontend_request_failed" },
      "Frontend request failed"
    );
  });
  const server = http.createServer((request, response) => {
    protectStaging(request, response, () => handler(request, response));
  });
  server.on("error", () => {
    logger.error({ event: "shared_server_error" }, "Shared server failed");
    process.exitCode = 1;
  });
  server.listen(port, "0.0.0.0", () => {
    logger.info({ port }, "Shared pilot server started");
  });

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

if (require.main === module) {
  start().catch((error) => {
    console.error(
      error instanceof StartupError
        ? error.message
        : "Shared pilot server could not initialize Next.js or the backend."
    );
    process.exitCode = 1;
  });
}

module.exports = { createRequestHandler, isBackendPath };
