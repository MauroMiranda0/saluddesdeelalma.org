-- Remove free-form patient notes so the directory cannot store clinical records.
ALTER TABLE "patients" DROP COLUMN IF EXISTS "notes";
