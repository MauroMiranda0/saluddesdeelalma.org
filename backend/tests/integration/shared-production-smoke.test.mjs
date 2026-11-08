import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
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

test("failed full preflight closes the early listener", { timeout: 15000 }, async () => {
  const reservation = createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const address = reservation.address();
  assert.ok(address && typeof address !== "string");
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve()))
  );
  const result = spawnSync(process.execPath, ["-e", 'require("./server.cjs")'], {
    cwd: root,
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      NODE_ENV: "production",
      SHARED_PILOT_BUILD: "true",
      WHATSAPP_OUTBOUND_ENABLED: "false",
      NEXT_PUBLIC_API_BASE_URL: "/api/v1",
      API_PREFIX: "/api/v1",
      PORT: String(address.port),
      STAGING_AUTH_USER: "pilot",
      STAGING_AUTH_PASSWORD: "synthetic-password-at-least-32-characters"
    },
    encoding: "utf8",
    timeout: 10000
  });
  assert.equal(result.error, undefined);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Shared pilot preflight failed/);
  await new Promise((resolve, reject) => {
    reservation.once("error", reject);
    reservation.listen(address.port, "127.0.0.1", resolve);
  });
  await new Promise((resolve, reject) =>
    reservation.close((error) => (error ? reject(error) : resolve()))
  );
});

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
    const child = spawn(
      process.execPath,
      [
        "--require",
        "./backend/tests/integration/mock-shared-prisma.cjs",
        "--require",
        "./backend/tests/integration/mock-slow-next.cjs",
        "--require",
        "./backend/tests/integration/mock-hostinger-listen.cjs",
        "-e",
        'require("./server.cjs")'
      ],
      {
        cwd: root,
        env: {
          PATH: process.env.PATH,
          SystemRoot: process.env.SystemRoot,
          HOME: process.env.HOME,
          NODE_ENV: "production",
          SHARED_PILOT_BUILD: "true",
          NEXT_TELEMETRY_DISABLED: "1",
          STAGING_AUTH_USER: "synthetic-staging-user",
          STAGING_AUTH_PASSWORD:
            "synthetic-staging-password-at-least-32-characters",
          TEST_LISTEN_PORT: String(port),
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
      }
    );
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const base = `http://127.0.0.1:${port}`;
    const auth = `Basic ${Buffer.from("synthetic-staging-user:synthetic-staging-password-at-least-32-characters").toString("base64")}`;
    try {
      const deadline = Date.now() + 3000;
      let warming;
      while (Date.now() < deadline) {
        if (child.exitCode !== null)
          throw new Error(`Shared server exited: ${output}`);
        try {
          warming = await fetch(base, { signal: AbortSignal.timeout(250) });
          break;
        } catch {
          await wait(50);
        }
      }
      assert.ok(warming, `Shared server did not listen within 3 seconds: ${output}`);
      assert.equal(warming.status, 401);
      assert.equal(
        (await fetch(base, { headers: { authorization: auth } })).status,
        503
      );
      let home;
      for (let attempt = 0; attempt < 100; attempt += 1) {
        if (child.exitCode !== null)
          throw new Error(`Shared server exited: ${output}`);
        try {
          home = await fetch(`${base}/`, {
            headers: { authorization: auth },
            signal: AbortSignal.timeout(2000)
          });
          if (home.status === 200) break;
          await wait(250);
        } catch {
          await wait(250);
        }
      }
      assert.ok(home, `Shared server did not start: ${output}`);
      assert.equal(home.status, 200);
      assert.match(await home.text(), /Salud desde el Alma/);
      for (const route of [
        "/",
        "/admin/login",
        "/health",
        "/api/v1/health",
        "/api/v1/webhooks/whatsapp"
      ]) {
        assert.equal((await fetch(`${base}${route}`)).status, 401);
      }
      assert.equal(
        (
          await fetch(`${base}/admin/login`, {
            headers: { authorization: auth }
          })
        ).status,
        200
      );
      assert.equal(
        (await fetch(`${base}/health`, { headers: { authorization: auth } }))
          .status,
        200
      );
      const readiness = await fetch(`${base}/api/v1/health`, {
        headers: { authorization: auth },
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
            "x-hub-signature-256": header,
            authorization: auth
          },
          body
        });
      assert.equal((await webhook(`sha256=${signature}`)).status, 202);
      assert.equal((await webhook("sha256=invalid")).status, 403);
      assert.equal(
        (
          await fetch(`${base}/api/v1/missing`, {
            headers: { authorization: auth }
          })
        ).status,
        404
      );
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
