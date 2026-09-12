import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith("/").default("/api/v1"),
  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z
    .string()
    .url()
    .default(
      "postgresql://postgres:postgres@localhost:5432/saluddesdeelalma?schema=public"
    ),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("development-only-secret-with-at-least-32-chars"),
  SESSION_COOKIE_NAME: z.string().min(1).default("sda_admin_session"),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  WHATSAPP_VERIFY_TOKEN: z
    .string()
    .min(1)
    .default("development-whatsapp-verify-token"),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_PSYCHOLOGISTS_GROUP_ID: z.string().min(1).optional(),
  REMINDER_TIMEZONE: z
    .literal("America/Mexico_City")
    .default("America/Mexico_City"),
  AI_PROVIDER_API_KEY: z.string().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  throw new Error(
    `Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`
  );
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.JWT_SECRET === "development-only-secret-with-at-least-32-chars"
) {
  throw new Error("JWT_SECRET must be replaced in production");
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  (!parsedEnv.data.WHATSAPP_ACCESS_TOKEN ||
    !parsedEnv.data.WHATSAPP_PHONE_NUMBER_ID ||
    !parsedEnv.data.WHATSAPP_PSYCHOLOGISTS_GROUP_ID)
) {
  throw new Error(
    "WhatsApp credentials and psychology group destination must be configured in production"
  );
}

if (
  parsedEnv.data.NODE_ENV === "production" &&
  parsedEnv.data.WHATSAPP_VERIFY_TOKEN === "development-whatsapp-verify-token"
) {
  throw new Error("WHATSAPP_VERIFY_TOKEN must be replaced in production");
}

export const env = parsedEnv.data;
