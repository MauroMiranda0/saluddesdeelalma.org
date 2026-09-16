CREATE EXTENSION IF NOT EXISTS "btree_gist";

ALTER TYPE "ReminderType" ADD VALUE IF NOT EXISTS 'pago_pendiente_post_cita';

CREATE TYPE "TherapyType" AS ENUM ('individual', 'pareja', 'familiar');

CREATE TABLE "therapist_profiles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "therapist_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "therapist_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "therapist_profiles_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE OR REPLACE FUNCTION validate_therapist_profile_user()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM "users"
    WHERE "id" = NEW."user_id" AND "role" IN ('admin', 'psicologo')
  ) THEN
    RAISE EXCEPTION 'therapist profile requires an admin or psychologist user'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER therapist_profiles_validate_user
  BEFORE INSERT OR UPDATE OF "user_id" ON "therapist_profiles"
  FOR EACH ROW EXECUTE FUNCTION validate_therapist_profile_user();

-- Existing records are intentionally left unassigned. The admin must assign a
-- therapist before creating any new appointment under the updated rules.
ALTER TABLE "patients" ADD COLUMN "assigned_therapist_id" UUID;
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_therapist_id_fkey"
  FOREIGN KEY ("assigned_therapist_id") REFERENCES "therapist_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "patients_assigned_therapist_id_idx" ON "patients"("assigned_therapist_id");

ALTER TABLE "appointments" ADD COLUMN "therapist_id" UUID;
ALTER TABLE "appointments" ADD COLUMN "therapy_type" "TherapyType";
ALTER TABLE "appointments" ADD COLUMN "duration_minutes" INTEGER;
ALTER TABLE "appointments" ADD COLUMN "ends_at" TIMESTAMPTZ;
ALTER TABLE "appointments" ADD COLUMN "completed_at" TIMESTAMPTZ;

-- Historical appointments have no safe therapist/type inference. They remain
-- outside the new active-scheduling constraint until admin regularizes them.
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_therapist_id_fkey"
  FOREIGN KEY ("therapist_id") REFERENCES "therapist_profiles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE OR REPLACE FUNCTION validate_appointment_therapist_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."therapist_id" IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM "patients" p
    JOIN "therapist_profiles" t ON t."id" = NEW."therapist_id"
    WHERE p."id" = NEW."patient_id"
      AND p."assigned_therapist_id" = NEW."therapist_id"
      AND t."is_active" = true
  ) THEN
    RAISE EXCEPTION 'appointment therapist must be the patient assigned active therapist'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER appointments_validate_therapist_assignment
  BEFORE INSERT OR UPDATE OF "patient_id", "therapist_id" ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION validate_appointment_therapist_assignment();
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_duration_matches_type_check"
  CHECK (
    "therapy_type" IS NULL
    OR ("therapy_type" = 'individual' AND "duration_minutes" = 60)
    OR ("therapy_type" IN ('pareja', 'familiar') AND "duration_minutes" = 90)
  );
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_end_matches_duration_check"
  CHECK (
    "ends_at" IS NULL
    OR "ends_at" = "scheduled_at" + make_interval(mins => "duration_minutes")
  );

DROP INDEX "appointments_active_scheduled_at_key";
CREATE INDEX "appointments_therapist_id_scheduled_at_idx"
  ON "appointments"("therapist_id", "scheduled_at");
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_active_therapist_interval_excl"
  EXCLUDE USING gist (
    "therapist_id" WITH =,
    tstzrange("scheduled_at", "ends_at", '[)') WITH &&
  ) WHERE (
    "therapist_id" IS NOT NULL
    AND "ends_at" IS NOT NULL
    AND "status" IN ('programada', 'confirmada')
  );

ALTER TYPE "ReminderRecipient" RENAME TO "ReminderRecipient_legacy";
CREATE TYPE "ReminderRecipient" AS ENUM ('paciente', 'grupo_psicologas');
ALTER TABLE "appointment_reminders" ALTER COLUMN "recipient" DROP DEFAULT;
ALTER TABLE "appointment_reminders"
  ALTER COLUMN "recipient" TYPE "ReminderRecipient"
  USING CASE WHEN "recipient"::text = 'admin' THEN 'grupo_psicologas'::"ReminderRecipient"
             ELSE "recipient"::text::"ReminderRecipient" END;
ALTER TABLE "appointment_reminders" ALTER COLUMN "recipient" SET DEFAULT 'paciente';
DROP TYPE "ReminderRecipient_legacy";
