import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const backendDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const require = createRequire(import.meta.url);
const ecosystem = require(join(backendDirectory, "ecosystem.config.js")) as {
  apps: Array<{ name: string; script: string }>;
};

test("PM2 declara una instancia dedicada por worker y el API no los inicia", async () => {
  const workers = ecosystem.apps.filter((app) =>
    ["reminders", "whatsapp-inbox"].includes(app.name)
  );
  assert.deepEqual(workers.map(({ name }) => name).sort(), [
    "reminders",
    "whatsapp-inbox"
  ]);
  assert.equal(new Set(workers.map(({ name }) => name)).size, workers.length);

  const api = ecosystem.apps.find((app) => app.name === "api");
  assert.equal(api?.script, "dist/server.js");
  assert.equal(
    workers.some((worker) => worker.script === api?.script),
    false
  );

  const serverSource = await readFile(
    join(backendDirectory, "src", "server.ts"),
    "utf8"
  );
  assert.doesNotMatch(
    serverSource,
    /startReminderWorker|startWhatsAppInboxWorker/
  );
});
