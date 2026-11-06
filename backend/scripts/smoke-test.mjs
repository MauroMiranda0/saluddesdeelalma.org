import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDirectory, "../..");
const smokeDatabaseUrl = process.env.SMOKE_DATABASE_URL;

const validateSmokeDatabaseUrl = (value) => {
  if (!value) {
    return;
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(
      "SMOKE_DATABASE_URL must be a local disposable PostgreSQL URL"
    );
  }

  const databaseName = decodeURIComponent(url.pathname.slice(1));
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const disposableName = /(?:^|[-_])(smoke|test)(?:$|[-_])/i.test(databaseName);
  const syntheticCredentials =
    (!url.username || url.username === "smoke") &&
    (!url.password || url.password === "smoke");

  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !localHost ||
    !disposableName ||
    !syntheticCredentials
  ) {
    throw new Error(
      "SMOKE_DATABASE_URL is restricted to loopback PostgreSQL, a *_smoke or *_test database, and empty or synthetic smoke credentials"
    );
  }
};

try {
  validateSmokeDatabaseUrl(smokeDatabaseUrl);
} catch (error) {
  console.error(
    error instanceof Error
      ? error.message
      : "Invalid local smoke database configuration"
  );
  process.exit(2);
}

const safeEnvironment = {
  PATH: process.env.PATH ?? "",
  SystemRoot: process.env.SystemRoot ?? "",
  WINDIR: process.env.WINDIR ?? "",
  ComSpec: process.env.ComSpec ?? "",
  TEMP: process.env.TEMP ?? "",
  TMP: process.env.TMP ?? "",
  USERPROFILE: process.env.USERPROFILE ?? "",
  HOME: process.env.HOME ?? "",
  APPDATA: process.env.APPDATA ?? "",
  LOCALAPPDATA: process.env.LOCALAPPDATA ?? "",
  NODE_ENV: "test",
  NEXT_TELEMETRY_DISABLED: "1",
  SMOKE_REPOSITORY_ROOT: repositoryRoot,
  DATABASE_URL: "postgresql://smoke:smoke@127.0.0.1:5432/sda_smoke",
  JWT_SECRET: "synthetic-smoke-jwt-secret-not-for-authentication",
  SUPABASE_URL: "https://smoke.invalid",
  SUPABASE_ANON_KEY: "synthetic-smoke-supabase-key",
  META_APP_SECRET: "synthetic-smoke-meta-app-secret",
  WHATSAPP_VERIFY_TOKEN: "synthetic-smoke-verify-token",
  WHATSAPP_OUTBOUND_ENABLED: "false",
  FRONTEND_ORIGIN: "http://127.0.0.1:3000",
  API_PREFIX: "/api/v1",
  ...(smokeDatabaseUrl ? { SMOKE_DATABASE_URL: smokeDatabaseUrl } : {})
};

const testFiles = [
  "backend/tests/smoke/app-smoke.test.ts",
  "backend/tests/contract/health.contract.test.ts",
  "backend/tests/contract/whatsapp-webhook.contract.test.ts",
  "backend/tests/unit/whatsapp-gateway.test.ts",
  "backend/tests/unit/whatsapp-inbox-outbox.test.ts"
];

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", "--test-concurrency=1", ...testFiles],
  {
    cwd: repositoryRoot,
    env: safeEnvironment,
    stdio: "inherit"
  }
);

if (result.error) {
  console.error("Could not start the local smoke test runner.");
  process.exit(2);
}

process.exit(result.status ?? 1);
