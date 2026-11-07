"use strict";

const { spawnSync } = require("node:child_process");

const buildArguments = (sharedPilot) =>
  sharedPilot === "true" ? ["build", "--webpack"] : ["build"];

if (require.main === module) {
  const result = spawnSync(
    process.execPath,
    [
      require.resolve("next/dist/bin/next"),
      ...buildArguments(process.env.SHARED_PILOT_BUILD)
    ],
    { stdio: "inherit" }
  );
  if (result.error) {
    console.error("Could not start the Next.js build:", result.error.message);
    process.exitCode = 1;
  } else if (result.signal) {
    console.error(`Next.js build terminated by signal ${result.signal}`);
    process.exitCode = 1;
  } else {
    process.exitCode = result.status;
  }
}

module.exports = { buildArguments };
