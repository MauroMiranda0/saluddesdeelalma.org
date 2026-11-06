#!/usr/bin/env node
// Validates production configuration without printing environment values.
//
// Usage:
//   node scripts/validate-production-env.mjs --backend-env /secure/path [--require-migration]

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const PLACEHOLDER_PATTERNS = [
  /replace-with-/i,
  /placeholder/i,
  /change[-_ ]?me/i,
  /^development-/i,
  /^your[-_]/i,
  /^<.*>$/,
  /^todo$/i
];

const isPlaceholder = (value) => {
  if (value === undefined || value === null) {
    return true;
  }
  const trimmed = String(value).trim();
  return (
    trimmed === "" ||
    trimmed === '""' ||
    trimmed === "''" ||
    PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed))
  );
};

const parseEnvFile = (content) => {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    const match = line.match(
      /^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/
    );
    if (!match) {
      continue;
    }
    const [, key, rawValue] = match;
    let value = rawValue.trim();
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"));
    if (quoted) {
      value = value.slice(1, -1);
    } else {
      const commentIndex = value.search(/\s+#/);
      if (commentIndex >= 0) {
        value = value.slice(0, commentIndex).trim();
      }
    }
    values[key] = value;
  }
  return values;
};

export const validateProductionEnvironment = (
  args = process.argv.slice(2),
  environment = process.env
) => {
  const requireMigration = args.includes("--require-migration");
  const requireFrontend = args.includes("--require-frontend");
  const requireFrontendRelative = args.includes("--require-frontend-relative");
  const processEnvOnly = args.includes("--process-env");
  const requireWhatsAppOutboundDisabled = args.includes(
    "--require-whatsapp-outbound-disabled"
  );
  const optionValue = (name) => {
    const index = args.indexOf(name);
    return index < 0 ? undefined : args[index + 1];
  };
  const envFileArgument =
    optionValue("--backend-env") ??
    environment.BACKEND_ENV_FILE ??
    args.find((argument) => !argument.startsWith("--"));
  const envFile = resolve(
    process.cwd(),
    envFileArgument ?? environment.ENV_FILE ?? ".env.production"
  );
  const errors = [];
  const warnings = [];
  const error = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);

  if (processEnvOnly && (optionValue("--backend-env") || requireFrontend)) {
    console.error("[ERROR] Opciones de preflight incompatibles.");
    return 1;
  }

  if (!processEnvOnly && !existsSync(envFile)) {
    console.error("[ERROR] No existe el archivo de entorno de producción.");
    console.error(
      "[ERROR] Crear el archivo indicado en DEPLOY_EXECUTION_GUIDE.md."
    );
    return 1;
  }

  const env = processEnvOnly
    ? {}
    : { ...parseEnvFile(readFileSync(envFile, "utf8")) };
  for (const [key, value] of Object.entries(environment)) {
    if (value !== undefined) {
      env[key] = value;
    }
  }

  const required = [
    "NODE_ENV",
    "PORT",
    "API_PREFIX",
    "FRONTEND_ORIGIN",
    "DATABASE_URL",
    "JWT_SECRET",
    "ADMIN_ACCESS_RECOVERY_TOKEN",
    "SESSION_COOKIE_NAME",
    "SESSION_IDLE_TIMEOUT_MINUTES",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "META_APP_SECRET",
    "WHATSAPP_VERIFY_TOKEN",
    "WHATSAPP_ACCESS_TOKEN",
    "WHATSAPP_PHONE_NUMBER_ID",
    "WHATSAPP_ADMIN_PHONE",
    "WHATSAPP_PSYCHOLOGISTS_GROUP_ID",
    "REMINDER_TIMEZONE"
  ];

  for (const key of required) {
    if (isPlaceholder(env[key])) {
      error(`${key} falta o conserva un valor placeholder.`);
    }
  }

  if (env.WHATSAPP_OUTBOUND_ENABLED === undefined) {
    warn(
      "WHATSAPP_OUTBOUND_ENABLED no definida; el envio saliente quedara deshabilitado."
    );
  } else if (!["true", "false"].includes(env.WHATSAPP_OUTBOUND_ENABLED)) {
    error('WHATSAPP_OUTBOUND_ENABLED debe ser exactamente "true" o "false".');
  }
  if (
    requireWhatsAppOutboundDisabled &&
    env.WHATSAPP_OUTBOUND_ENABLED !== "false"
  ) {
    error('WHATSAPP_OUTBOUND_ENABLED debe ser "false" en modo piloto.');
  }

  if (env.NODE_ENV && env.NODE_ENV !== "production") {
    error('NODE_ENV debe ser "production".');
  }
  if (env.API_PREFIX && env.API_PREFIX !== "/api/v1") {
    warn('API_PREFIX distinto de "/api/v1".');
  }
  if (env.PORT && !/^\d+$/.test(env.PORT)) {
    error("PORT debe ser numérico.");
  }
  if (!isPlaceholder(env.JWT_SECRET) && env.JWT_SECRET.trim().length < 32) {
    error("JWT_SECRET debe tener al menos 32 caracteres.");
  }
  if (
    !isPlaceholder(env.ADMIN_ACCESS_RECOVERY_TOKEN) &&
    env.ADMIN_ACCESS_RECOVERY_TOKEN.trim().length < 32
  ) {
    error("ADMIN_ACCESS_RECOVERY_TOKEN debe tener al menos 32 caracteres.");
  }
  if (
    !isPlaceholder(env.SESSION_IDLE_TIMEOUT_MINUTES) &&
    env.SESSION_IDLE_TIMEOUT_MINUTES !== "30"
  ) {
    error("SESSION_IDLE_TIMEOUT_MINUTES debe ser 30 en producción.");
  }

  if (!isPlaceholder(env.FRONTEND_ORIGIN)) {
    const origins = env.FRONTEND_ORIGIN.split(",").map((origin) =>
      origin.trim()
    );
    if (origins.length === 0 || origins.some((origin) => origin.length === 0)) {
      error("FRONTEND_ORIGIN debe contener una lista de orígenes explícitos.");
    }
    for (const origin of origins.filter(Boolean)) {
      try {
        const url = new URL(origin);
        if (
          url.protocol !== "https:" ||
          url.origin !== origin ||
          url.username !== "" ||
          url.password !== "" ||
          url.pathname !== "/" ||
          url.search !== "" ||
          url.hash !== ""
        ) {
          error("FRONTEND_ORIGIN debe contener solo orígenes HTTPS.");
        }
        if (["localhost", "127.0.0.1"].includes(url.hostname)) {
          error("FRONTEND_ORIGIN no puede apuntar a localhost.");
        }
      } catch {
        error("FRONTEND_ORIGIN contiene una URL inválida.");
      }
    }
    if (new Set(origins).size !== origins.length) {
      error("FRONTEND_ORIGIN contiene orígenes duplicados.");
    }
  }

  if (!isPlaceholder(env.DATABASE_URL)) {
    try {
      const url = new URL(env.DATABASE_URL);
      if (!["postgres:", "postgresql:"].includes(url.protocol)) {
        error("DATABASE_URL debe usar el esquema postgresql://.");
      }
      if (url.port !== "6543") {
        error("DATABASE_URL debe usar el pooler de runtime en puerto 6543.");
      }
      if (!url.hostname.endsWith("pooler.supabase.com")) {
        error("DATABASE_URL debe apuntar al pooler de Supabase.");
      }
      if (!url.username.includes(".")) {
        error("DATABASE_URL debe usar el usuario de pooler de Supabase.");
      }
      if (url.searchParams.get("pgbouncer") !== "true") {
        error("DATABASE_URL debe incluir el parámetro pgbouncer=true.");
      }
      if (url.password === "" || isPlaceholder(url.password)) {
        error("DATABASE_URL no incluye una contraseña válida.");
      }
    } catch {
      error("DATABASE_URL no es una URL válida.");
    }
  }

  if (!isPlaceholder(env.SUPABASE_URL)) {
    try {
      const url = new URL(env.SUPABASE_URL);
      if (
        url.protocol !== "https:" ||
        url.origin !== env.SUPABASE_URL ||
        url.pathname !== "/" ||
        url.search !== "" ||
        url.hash !== ""
      ) {
        error("SUPABASE_URL debe ser una URL HTTPS de origen.");
      }
    } catch {
      error("SUPABASE_URL no es una URL válida.");
    }
  }

  if (requireMigration) {
    const migrationUrl = environment.MIGRATION_DATABASE_URL;
    if (isPlaceholder(migrationUrl)) {
      error("MIGRATION_DATABASE_URL falta o conserva un valor placeholder.");
    } else {
      try {
        const url = new URL(migrationUrl);
        if (!["postgres:", "postgresql:"].includes(url.protocol)) {
          error("MIGRATION_DATABASE_URL debe usar el esquema postgresql://.");
        }
        if (url.port !== "5432") {
          error(
            "MIGRATION_DATABASE_URL debe usar el pooler de sesión en puerto 5432."
          );
        }
        if (!url.hostname.endsWith("pooler.supabase.com")) {
          error("MIGRATION_DATABASE_URL debe apuntar al pooler de Supabase.");
        }
        if (url.password === "" || isPlaceholder(url.password)) {
          error("MIGRATION_DATABASE_URL no incluye una contraseña válida.");
        }
      } catch {
        error("MIGRATION_DATABASE_URL no es una URL válida.");
      }
    }
  }

  if (requireFrontend) {
    const frontendUrl = environment.NEXT_PUBLIC_API_BASE_URL;
    if (isPlaceholder(frontendUrl)) {
      error("NEXT_PUBLIC_API_BASE_URL falta o conserva un valor placeholder.");
    } else {
      try {
        const url = new URL(frontendUrl);
        if (
          url.protocol !== "https:" ||
          url.pathname !== "/api/v1" ||
          url.search !== "" ||
          url.hash !== ""
        ) {
          error(
            "NEXT_PUBLIC_API_BASE_URL debe ser HTTPS y terminar en /api/v1."
          );
        }
      } catch {
        error("NEXT_PUBLIC_API_BASE_URL no es una URL válida.");
      }
    }
  }

  if (
    requireFrontendRelative &&
    environment.NEXT_PUBLIC_API_BASE_URL !== "/api/v1"
  ) {
    error('NEXT_PUBLIC_API_BASE_URL debe ser exactamente "/api/v1".');
  }

  if (
    !isPlaceholder(env.WHATSAPP_PHONE_NUMBER_ID) &&
    !/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID.trim())
  ) {
    error("WHATSAPP_PHONE_NUMBER_ID debe ser numérico.");
  }
  if (
    !isPlaceholder(env.WHATSAPP_ADMIN_PHONE) &&
    !/^\d{10,15}$/.test(env.WHATSAPP_ADMIN_PHONE.trim())
  ) {
    error("WHATSAPP_ADMIN_PHONE debe tener 10-15 dígitos.");
  }
  if (
    !isPlaceholder(env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) &&
    /\s/.test(env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID)
  ) {
    error("WHATSAPP_PSYCHOLOGISTS_GROUP_ID no debe contener espacios.");
  }
  if (
    env.AI_PROVIDER_API_KEY !== undefined &&
    env.AI_PROVIDER_API_KEY !== "" &&
    isPlaceholder(env.AI_PROVIDER_API_KEY)
  ) {
    error(
      "AI_PROVIDER_API_KEY tiene un placeholder; eliminarla o configurarla."
    );
  }
  if (
    env.REMINDER_TIMEZONE &&
    env.REMINDER_TIMEZONE !== "America/Mexico_City"
  ) {
    warn('REMINDER_TIMEZONE distinto de "America/Mexico_City".');
  }

  console.log("Validando nombres y formatos de variables de producción.");
  for (const message of errors) {
    console.log(`[ERROR] ${message}`);
  }
  for (const message of warnings) {
    console.log(`[WARN]  ${message}`);
  }
  console.log("");
  if (errors.length > 0) {
    console.log(
      `Resultado: ${errors.length} error(es), ${warnings.length} advertencia(s).`
    );
    return 1;
  }

  console.log(
    `Resultado: OK (${warnings.length} advertencia(s)); no se imprimieron valores.`
  );
  return 0;
};

if (
  process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = validateProductionEnvironment();
}
