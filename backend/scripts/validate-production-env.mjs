#!/usr/bin/env node
// Valida una configuración de producción antes de desplegar.
//
// Uso:
//   node scripts/validate-production-env.mjs [ruta-al-archivo-env]
//
// Por defecto valida `backend/.env.production` (o `$ENV_FILE`). Las variables
// ya presentes en process.env tienen prioridad sobre las del archivo.
//
// Sale con código 1 si hay errores bloqueantes. Nunca imprime valores secretos.

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  if (trimmed === "" || trimmed === '""' || trimmed === "''") {
    return true;
  }
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
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

const envFile = resolve(
  process.cwd(),
  process.argv[2] ?? process.env.ENV_FILE ?? ".env.production"
);

const errors = [];
const warnings = [];
const notes = [];

const error = (message) => errors.push(message);
const warn = (message) => warnings.push(message);

if (!existsSync(envFile)) {
  console.error(`[ERROR] No existe el archivo de entorno: ${envFile}`);
  console.error(
    "        Crear backend/.env.production (ver .env.production.example)."
  );
  process.exit(1);
}

const fileValues = parseEnvFile(readFileSync(envFile, "utf8"));
const env = { ...fileValues };
for (const [key, value] of Object.entries(process.env)) {
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
  "SESSION_COOKIE_NAME",
  "SESSION_IDLE_TIMEOUT_MINUTES",
  "COOKIE_DOMAIN",
  "WHATSAPP_VERIFY_TOKEN",
  "WHATSAPP_ACCESS_TOKEN",
  "WHATSAPP_PHONE_NUMBER_ID",
  "WHATSAPP_ADMIN_PHONE",
  "WHATSAPP_PSYCHOLOGISTS_GROUP_ID",
  "REMINDER_TIMEZONE",
  "ENABLE_REMINDER_WORKER",
  "ENABLE_WHATSAPP_INBOX_WORKER"
];

for (const key of required) {
  if (isPlaceholder(env[key])) {
    error(`${key} falta o conserva un valor placeholder.`);
  }
}

if (env.NODE_ENV && env.NODE_ENV !== "production") {
  error(`NODE_ENV debe ser "production" (actual: "${env.NODE_ENV}").`);
}

if (env.API_PREFIX && env.API_PREFIX !== "/api/v1") {
  warn(`API_PREFIX distinto de "/api/v1" (actual: "${env.API_PREFIX}").`);
}

if (env.PORT && !/^\d+$/.test(env.PORT)) {
  error("PORT debe ser numérico.");
}

if (!isPlaceholder(env.JWT_SECRET) && env.JWT_SECRET.trim().length < 32) {
  error("JWT_SECRET debe tener al menos 32 caracteres.");
}

if (
  !isPlaceholder(env.SESSION_IDLE_TIMEOUT_MINUTES) &&
  env.SESSION_IDLE_TIMEOUT_MINUTES !== "30"
) {
  error("SESSION_IDLE_TIMEOUT_MINUTES debe ser 30 en producción.");
}

if (!isPlaceholder(env.COOKIE_DOMAIN)) {
  if (!env.COOKIE_DOMAIN.startsWith(".")) {
    error('COOKIE_DOMAIN debe empezar con "." (ej. .saluddesdeelalma.org).');
  } else if (env.COOKIE_DOMAIN !== ".saluddesdeelalma.org") {
    warn(
      `COOKIE_DOMAIN distinto de ".saluddesdeelalma.org" (actual: "${env.COOKIE_DOMAIN}").`
    );
  }
}

if (!isPlaceholder(env.FRONTEND_ORIGIN)) {
  const origins = env.FRONTEND_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) {
    error("FRONTEND_ORIGIN no contiene orígenes válidos.");
  }
  for (const origin of origins) {
    try {
      const url = new URL(origin);
      if (url.protocol !== "https:") {
        error(`FRONTEND_ORIGIN debe usar HTTPS: "${origin}".`);
      }
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
        error(`FRONTEND_ORIGIN no puede apuntar a localhost: "${origin}".`);
      }
    } catch {
      error(`FRONTEND_ORIGIN contiene una URL inválida: "${origin}".`);
    }
  }
}

if (!isPlaceholder(env.DATABASE_URL)) {
  try {
    const url = new URL(env.DATABASE_URL);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      error("DATABASE_URL debe usar el esquema postgresql://.");
    }
    if (url.port !== "6543") {
      error(
        `DATABASE_URL debe usar el pooler de Supabase en el puerto 6543 (actual: ${url.port || "sin puerto"}).`
      );
    }
    if (!url.hostname.endsWith("pooler.supabase.com")) {
      warn(
        `DATABASE_URL no apunta a *.pooler.supabase.com (actual: ${url.hostname}).`
      );
    }
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      error("DATABASE_URL no puede apuntar a localhost en producción.");
    }
    if (
      url.hostname.endsWith("pooler.supabase.com") &&
      !url.username.includes(".")
    ) {
      warn(
        'El usuario del pooler de Supabase suele tener el formato "postgres.<project-ref>".'
      );
    }
    if (!url.searchParams.has("pgbouncer")) {
      notes.push(
        "Sugerencia: añadir ?pgbouncer=true a DATABASE_URL para el pooler de Supabase."
      );
    }
    if (url.password === "" || isPlaceholder(url.password)) {
      error("DATABASE_URL no incluye una contraseña válida.");
    }
  } catch {
    error("DATABASE_URL no es una URL válida.");
  }
}

if (!isPlaceholder(env.WHATSAPP_PHONE_NUMBER_ID)) {
  if (!/^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID.trim())) {
    error(
      "WHATSAPP_PHONE_NUMBER_ID debe ser numérico, sin espacios ni símbolos."
    );
  }
}

if (!isPlaceholder(env.WHATSAPP_ADMIN_PHONE)) {
  if (!/^\d{10,15}$/.test(env.WHATSAPP_ADMIN_PHONE.trim())) {
    error(
      "WHATSAPP_ADMIN_PHONE debe tener 10-15 dígitos en formato internacional, sin espacios."
    );
  }
}

if (
  !isPlaceholder(env.WHATSAPP_VERIFY_TOKEN) &&
  env.WHATSAPP_VERIFY_TOKEN.length < 8
) {
  warn("WHATSAPP_VERIFY_TOKEN es muy corto; usar un valor aleatorio largo.");
}

if (
  !isPlaceholder(env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID) &&
  /\s/.test(env.WHATSAPP_PSYCHOLOGISTS_GROUP_ID)
) {
  error("WHATSAPP_PSYCHOLOGISTS_GROUP_ID no debe contener espacios.");
}

for (const key of ["ENABLE_REMINDER_WORKER", "ENABLE_WHATSAPP_INBOX_WORKER"]) {
  if (!isPlaceholder(env[key]) && env[key] !== "true") {
    error(`${key} debe ser "true" en producción.`);
  }
}

if (
  env.AI_PROVIDER_API_KEY !== undefined &&
  env.AI_PROVIDER_API_KEY !== "" &&
  isPlaceholder(env.AI_PROVIDER_API_KEY)
) {
  error(
    "AI_PROVIDER_API_KEY está definida con un placeholder; eliminarla o darle un valor real."
  );
}

if (isPlaceholder(env.ADMIN_SEED_PASSWORD)) {
  warn(
    "ADMIN_SEED_PASSWORD falta o es placeholder; el seed inicial del admin fallará."
  );
}

if (env.REMINDER_TIMEZONE && env.REMINDER_TIMEZONE !== "America/Mexico_City") {
  warn(
    `REMINDER_TIMEZONE distinto de "America/Mexico_City" (actual: "${env.REMINDER_TIMEZONE}").`
  );
}

console.log(`Validando configuración de producción: ${envFile}`);
console.log("");

for (const message of errors) {
  console.log(`[ERROR] ${message}`);
}
for (const message of warnings) {
  console.log(`[WARN]  ${message}`);
}
for (const message of notes) {
  console.log(`[INFO]  ${message}`);
}

console.log("");
if (errors.length > 0) {
  console.log(
    `Resultado: ${errors.length} error(es), ${warnings.length} advertencia(s). El backend NO arrancará en producción.`
  );
  process.exit(1);
}

console.log(
  `Resultado: OK (${warnings.length} advertencia(s)). La configuración cumple los requisitos de producción.`
);
