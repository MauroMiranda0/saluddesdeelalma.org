import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(
  new URL("../../scripts/validate-production-env.mjs", import.meta.url)
);

const createBackendEnv = async (
  directory: string,
  outboundEnabled?: "true" | "false"
) => {
  const path = join(directory, "runtime.env");
  await writeFile(
    path,
    [
      "NODE_ENV=production",
      "PORT=4000",
      "API_PREFIX=/api/v1",
      "FRONTEND_ORIGIN=https://saluddesdeelalma.org,https://www.saluddesdeelalma.org",
      "DATABASE_URL=postgresql://postgres.projectref:fake-password@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true",
      "JWT_SECRET=fake-jwt-secret-with-32-characters-minimum",
      "ADMIN_ACCESS_RECOVERY_TOKEN=fake-recovery-token-with-32-characters-minimum",
      "SESSION_COOKIE_NAME=sda_admin_session",
      "SESSION_IDLE_TIMEOUT_MINUTES=30",
      "SUPABASE_URL=https://projectref.supabase.co",
      "SUPABASE_ANON_KEY=fake-anon-key",
      "META_APP_SECRET=fake-meta-app-secret",
      "WHATSAPP_VERIFY_TOKEN=fake-verify-token",
      ...(outboundEnabled
        ? [`WHATSAPP_OUTBOUND_ENABLED=${outboundEnabled}`]
        : []),
      "WHATSAPP_ACCESS_TOKEN=fake-access-token",
      "WHATSAPP_PHONE_NUMBER_ID=123456789012345",
      "WHATSAPP_ADMIN_PHONE=5215500000000",
      "WHATSAPP_PSYCHOLOGISTS_GROUP_ID=fake-group-id",
      "REMINDER_TIMEZONE=America/Mexico_City"
    ].join("\n"),
    { mode: 0o600 }
  );
  return path;
};

const runPreflight = (
  backendEnvPath: string,
  options: {
    migrationDatabaseUrl?: string;
    outboundEnabled?: string;
    requireOutboundDisabled?: boolean;
  } = {}
) => {
  const args = [
    scriptPath,
    "--backend-env",
    backendEnvPath,
    "--require-migration",
    "--require-frontend"
  ];
  if (options.requireOutboundDisabled) {
    args.push("--require-whatsapp-outbound-disabled");
  }
  return spawnSync(process.execPath, args, {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      MIGRATION_DATABASE_URL: options.migrationDatabaseUrl,
      NEXT_PUBLIC_API_BASE_URL: "https://api.saluddesdeelalma.org/api/v1",
      WHATSAPP_OUTBOUND_ENABLED: options.outboundEnabled
    }
  });
};

test("production preflight validates runtime and temporary migration URLs without printing values", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "sda-preflight-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const backendEnvPath = await createBackendEnv(directory);
  const migrationUrl =
    "postgresql://postgres.projectref:fake-migration-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres";

  const result = runPreflight(backendEnvPath, {
    migrationDatabaseUrl: migrationUrl
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /Resultado: OK/);
  assert.match(result.stdout, /WHATSAPP_OUTBOUND_ENABLED no definida/);
  for (const forbiddenValue of [
    "fake-password",
    "fake-jwt-secret",
    "fake-recovery-token",
    "fake-anon-key",
    "fake-meta-app-secret",
    "fake-verify-token",
    "fake-access-token",
    "fake-migration-password"
  ]) {
    assert.equal(result.stdout.includes(forbiddenValue), false);
    assert.equal(result.stderr.includes(forbiddenValue), false);
  }
});

test("preflight fails by variable name when migration URL is absent", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "sda-preflight-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const backendEnvPath = await createBackendEnv(directory);

  const result = runPreflight(backendEnvPath);
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /MIGRATION_DATABASE_URL/);
  assert.doesNotMatch(
    result.stdout,
    /fake-password|fake-jwt-secret|fake-anon-key/
  );
});

test("pilot preflight requires outbound disabled and rejects true", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "sda-preflight-pilot-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const backendEnvPath = await createBackendEnv(directory, "false");

  const disabledResult = runPreflight(backendEnvPath, {
    migrationDatabaseUrl:
      "postgresql://postgres.fake:fake-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    requireOutboundDisabled: true
  });
  assert.equal(
    disabledResult.status,
    0,
    disabledResult.stderr || disabledResult.stdout
  );

  const enabledResult = runPreflight(backendEnvPath, {
    migrationDatabaseUrl:
      "postgresql://postgres.fake:fake-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
    outboundEnabled: "true",
    requireOutboundDisabled: true
  });
  assert.notEqual(enabledResult.status, 0);
  assert.match(enabledResult.stdout, /WHATSAPP_OUTBOUND_ENABLED/);
  assert.equal(enabledResult.stdout.includes("fake-access-token"), false);
  assert.equal(enabledResult.stderr.includes("fake-access-token"), false);
});
