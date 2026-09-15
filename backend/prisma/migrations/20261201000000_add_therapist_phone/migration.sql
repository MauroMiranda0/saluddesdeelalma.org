-- Backfill existing profiles with an empty phone placeholder before making it
-- NOT NULL, then drop the default so the schema matches the Prisma model.
ALTER TABLE "therapist_profiles" ADD COLUMN "phone" VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE "therapist_profiles" ALTER COLUMN "phone" DROP DEFAULT;