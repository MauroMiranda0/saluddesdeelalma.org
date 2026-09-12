import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().startsWith("/").default("/api/v1"),
  FRONTEND_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  SESSION_COOKIE_NAME: z.string().min(1).default("sda_admin_session"),
  SESSION_IDLE_TIMEOUT_MINUTES: z.coerce.number().int().positive().default(30),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
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

type Environment = z.infer<typeof envSchema>;

const isPlaceholder = (value: string | undefined) =>
  !value || value.includes("replace-with-") || value.startsWith("development-");

export const assertProductionEnvironment = (environment: Environment) => {
  if (environment.NODE_ENV !== "production") {
    return;
  }

  if (isPlaceholder(environment.JWT_SECRET)) {
    throw new Error("JWT_SECRET must be replaced in production");
  }
  if (isPlaceholder(environment.DATABASE_URL)) {
    throw new Error("DATABASE_URL must be replaced in production");
  }
  if (isPlaceholder(environment.WHATSAPP_VERIFY_TOKEN)) {
    throw new Error("WHATSAPP_VERIFY_TOKEN must be replaced in production");
  }
  if (
    isPlaceholder(environment.WHATSAPP_ACCESS_TOKEN) ||
    isPlaceholder(environment.WHATSAPP_PHONE_NUMBER_ID) ||
    isPlaceholder(environment.WHATSAPP_PSYCHOLOGISTS_GROUP_ID)
  ) {
    throw new Error(
      "WhatsApp credentials and psychology group destination must be configured in production"
    );
  }
  if (
    environment.AI_PROVIDER_API_KEY &&
    isPlaceholder(environment.AI_PROVIDER_API_KEY)
  ) {
    throw new Error("AI_PROVIDER_API_KEY must be replaced in production");
  }
};

export const parseEnvironment = (input: NodeJS.ProcessEnv) => {
  const parsedEnv = envSchema.safeParse(input);

  if (!parsedEnv.success) {
    throw new Error(
      `Invalid environment configuration: ${z.prettifyError(parsedEnv.error)}`
    );
  }

  assertProductionEnvironment(parsedEnv.data);
  return parsedEnv.data;
};

export const env = parseEnvironment(process.env);
