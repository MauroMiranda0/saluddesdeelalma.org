ALTER TYPE "AdminRole" RENAME TO "AdminRole_legacy";
CREATE TYPE "UserRole" AS ENUM ('admin', 'psicologo', 'paciente');

ALTER TABLE "admin_users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "admin_users"
  ALTER COLUMN "role" TYPE "UserRole" USING "role"::text::"UserRole";
ALTER TABLE "admin_users" ALTER COLUMN "role" SET DEFAULT 'admin';
DROP TYPE "AdminRole_legacy";

ALTER TABLE "admin_users" RENAME TO "users";
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(50);
ALTER TABLE "users" ADD COLUMN "panel_login_enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;

UPDATE "users"
SET
  "email" = lower("email"),
  "username" = 'admin',
  "panel_login_enabled" = true
WHERE "role" = 'admin';

CREATE UNIQUE INDEX "users_username_key" ON "users"("username") WHERE "username" IS NOT NULL;
CREATE UNIQUE INDEX "users_single_admin_key" ON "users"("role") WHERE "role" = 'admin';

ALTER TABLE "users"
  ADD CONSTRAINT "users_email_lowercase_check" CHECK ("email" = lower("email")),
  ADD CONSTRAINT "users_access_profile_check" CHECK (
    (
      "role" = 'admin'
      AND "username" = 'admin'
      AND "panel_login_enabled" = true
      AND "password_hash" IS NOT NULL
    )
    OR
    (
      "role" <> 'admin'
      AND "username" IS NULL
      AND "panel_login_enabled" = false
      AND "password_hash" IS NULL
    )
  );

CREATE TYPE "CancellationNotice" AS ENUM ('a_tiempo', 'tardia');
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" TIMESTAMPTZ;
ALTER TABLE "appointments" ADD COLUMN "cancellation_notice" "CancellationNotice";

CREATE TYPE "ReminderRecipient" AS ENUM ('paciente', 'admin');
ALTER TABLE "appointment_reminders"
  ADD COLUMN "recipient" "ReminderRecipient" NOT NULL DEFAULT 'paciente';
DROP INDEX "appointment_reminders_appointment_id_reminder_type_key";
CREATE UNIQUE INDEX "appointment_reminders_appointment_id_reminder_type_recipient_key"
  ON "appointment_reminders"("appointment_id", "reminder_type", "recipient");

ALTER TABLE "patients" ADD COLUMN "user_id" UUID;
INSERT INTO "users" ("email", "full_name", "role")
SELECT lower('patient-' || "id"::text || '@directory.local'), "full_name", 'paciente'
FROM "patients";
UPDATE "patients"
SET "user_id" = "users"."id"
FROM "users"
WHERE "users"."email" = lower('patient-' || "patients"."id"::text || '@directory.local');
ALTER TABLE "patients" ALTER COLUMN "user_id" SET NOT NULL;
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
ALTER TABLE "patients"
  ADD CONSTRAINT "patients_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
