-- Convergence hardening: every new appointment must reference the patient's
-- assigned, active therapist. Historical unassigned rows keep their NULL so
-- existing records stay readable; only new inserts/updates are enforced.
CREATE OR REPLACE FUNCTION validate_appointment_therapist_assignment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."therapist_id" IS NULL THEN
    RAISE EXCEPTION 'appointment requires an assigned active therapist'
      USING ERRCODE = '23514';
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