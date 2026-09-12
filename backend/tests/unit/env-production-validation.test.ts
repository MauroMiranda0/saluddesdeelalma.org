import assert from "node:assert/strict";
import test from "node:test";

import {
  assertProductionEnvironment,
  parseEnvironment
} from "../../src/config/env.js";

const productionEnvironment = {
  NODE_ENV: "production" as const,
  PORT: 4000,
  API_PREFIX: "/api/v1",
  FRONTEND_ORIGIN: "https://saluddesdeelalma.org",
  DATABASE_URL: "postgresql://user:password@localhost:5432/salud",
  JWT_SECRET: "a-production-secret-with-at-least-32-characters",
  SESSION_COOKIE_NAME: "sda_admin_session",
  SESSION_IDLE_TIMEOUT_MINUTES: 30,
  WHATSAPP_VERIFY_TOKEN: "real-webhook-token",
  WHATSAPP_ACCESS_TOKEN: "real-access-token",
  WHATSAPP_PHONE_NUMBER_ID: "123456789",
  WHATSAPP_PSYCHOLOGISTS_GROUP_ID: "provider-group-id",
  REMINDER_TIMEZONE: "America/Mexico_City" as const,
  AI_PROVIDER_API_KEY: undefined,
  LOG_LEVEL: "info" as const
};

test("production rejects documented secret placeholders", () => {
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        WHATSAPP_ACCESS_TOKEN: "replace-with-whatsapp-access-token"
      }),
    /WhatsApp credentials/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        JWT_SECRET: "replace-with-a-strong-secret-of-at-least-32-characters"
      }),
    /JWT_SECRET/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        DATABASE_URL:
          "postgresql://replace-with-user:replace-with-password@localhost:5432/salud"
      }),
    /DATABASE_URL/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        WHATSAPP_PHONE_NUMBER_ID: "replace-with-whatsapp-phone-number-id"
      }),
    /WhatsApp credentials/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        WHATSAPP_PSYCHOLOGISTS_GROUP_ID:
          "replace-with-psychologists-group-destination"
      }),
    /WhatsApp credentials/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        WHATSAPP_VERIFY_TOKEN: "replace-with-meta-webhook-verify-token"
      }),
    /WHATSAPP_VERIFY_TOKEN/
  );
  assert.throws(
    () =>
      assertProductionEnvironment({
        ...productionEnvironment,
        AI_PROVIDER_API_KEY: "replace-with-ai-provider-api-key"
      }),
    /AI_PROVIDER_API_KEY/
  );
});

test("production accepts configured non-placeholder secrets", () => {
  assert.doesNotThrow(() => assertProductionEnvironment(productionEnvironment));
});

test("DATABASE_URL must be configured", () => {
  assert.throws(() => parseEnvironment({}), /DATABASE_URL/);
});
