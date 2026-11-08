"use strict";

const { start, StartupError } = require("./shared-server.cjs");

start().catch((error) => {
  console.error(
    error instanceof StartupError
      ? error.message
      : "Shared pilot server could not initialize Next.js or the backend."
  );
  process.exitCode = 1;
});
