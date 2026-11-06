import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHmac } from "node:crypto";
import { once } from "node:events";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../.."
);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test(
  "built shared server serves Next and Express with synthetic local configuration",
  { timeout: 90000 },
  async () => {
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const address = reservation.address();
    assert.ok(address && typeof address !== "string");
    const port = address.port;
    await new Promise((resolve, reject) =>
      reservation.close((error) => (error ? reject(error) : resolve()))
    );
    const secret = "synthetic-webhook-secret";
    const child = spawn(process.execPath, ["server.cjs"], {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        HOME: process.env.HOME,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
        PORT: String(port),
        API_PREFIX: "/api/v1",
        FRONTEND_ORIGIN: "https://example.invalid",
        DATABASE_URL:
          "postgresql://postgres.synthetic:synthetic@fake.pooler.supabase.com:6543/postgres?pgbouncer=true",
        JWT_SECRET: "synthetic-jwt-secret-at-least-32-characters",
        ADMIN_ACCESS_RECOVERY_TOKEN:
          "synthetic-recovery-secret-at-least-32-characters",
        SESSION_COOKIE_NAME: "sda_admin_session",
        SESSION_IDLE_TIMEOUT_MINUTES: "30",
        SUPABASE_URL: "https://synthetic.invalid",
        SUPABASE_ANON_KEY: "synthetic-anon-key",
        META_APP_SECRET: secret,
        WHATSAPP_VERIFY_TOKEN: "synthetic-verification-token",
        WHATSAPP_OUTBOUND_ENABLED: "false",
        WHATSAPP_ACCESS_TOKEN: "synthetic-access-token",
        WHATSAPP_PHONE_NUMBER_ID: "123456789012345",
        WHATSAPP_ADMIN_PHONE: "5215500000000",
        WHATSAPP_PSYCHOLOGISTS_GROUP_ID: "synthetic-group",
        REMINDER_TIMEZONE: "America/Mexico_City",
        NEXT_PUBLIC_API_BASE_URL: "/api/v1"
      },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const base = `http://127.0.0.1:${port}`;
    try {
      let home;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (child.exitCode !== null)
          throw new Error(`Shared server exited: ${output}`);
        try {
          home = await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) });
          break;
        } catch {
          await wait(250);
        }
      }
      assert.ok(home, `Shared server did not start: ${output}`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /Salud desde el Alma/);
      assert.equal((await fetch(`${base}/admin/login`)).status, 200);
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const readiness = await fetch(`${base}/api/v1/health`, {
        signal: AbortSignal.timeout(20000)
      });
      assert.equal(readiness.status, 503);
      assert.equal((await readiness.json()).database, false);

      const body = JSON.stringify({
        object: "whatsapp_business_account",
        entry: []
      });
      const signature = createHmac("sha256", secret).update(body).digest("hex");
      const webhook = (header) =>
        fetch(`${base}/api/v1/webhooks/whatsapp`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-hub-signature-256": header
          },
          body
        });
      assert.equal((await webhook(`sha256=${signature}`)).status, 202);
      assert.equal((await webhook("sha256=invalid")).status, 403);
      assert.equal((await fetch(`${base}/api/v1/missing`)).status, 404);
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill("SIGTERM");
        await Promise.race([once(child, "exit"), wait(5000)]);
        if (child.exitCode === null && child.signalCode === null) {
          child.kill("SIGKILL");
          await once(child, "exit");
        }
      }
    }
  }
);
