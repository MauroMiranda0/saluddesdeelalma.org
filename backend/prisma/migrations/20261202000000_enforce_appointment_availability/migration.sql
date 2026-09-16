-- Active appointments need complete interval data so the exclusion constraint
-- can protect a psychologist's schedule in every write path.
ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_active_interval_fields_check"
  CHECK (
    "status" NOT IN ('programada', 'confirmada')
    OR (
      "therapist_id" IS NOT NULL
      AND "therapy_type" IS NOT NULL
      AND "duration_minutes" IS NOT NULL
      AND "ends_at" IS NOT NULL
    )
  ) NOT VALID;

-- Revalidate therapist assignment whenever a cita is changed, including a
-- reprogramming that modifies its date, duration or status.
DROP TRIGGER IF EXISTS "appointments_validate_therapist_assignment" ON "appointments";
CREATE TRIGGER "appointments_validate_therapist_assignment"
  BEFORE INSERT OR UPDATE ON "appointments"
  FOR EACH ROW EXECUTE FUNCTION validate_appointment_therapist_assignment();
