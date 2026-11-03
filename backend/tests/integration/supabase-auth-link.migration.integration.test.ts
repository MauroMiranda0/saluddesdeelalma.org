import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const backendDirectory = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const migrationPath = (name: string) =>
  join(backendDirectory, "prisma", "migrations", name, "migration.sql");

test("Supabase auth link remains optional and does not replace domain UUIDs", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  await database.exec(`
    CREATE SEQUENCE domain_user_uuid_sequence START WITH 100;
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL VOLATILE AS $$
      SELECT (
        '00000000-0000-0000-0000-' ||
        lpad(nextval('domain_user_uuid_sequence')::text, 12, '0')
      )::uuid;
    $$;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY);
  `);

  const initialMigration = await readFile(
    migrationPath("20260904000000_initial"),
    "utf8"
  );
  await database.exec(
    initialMigration.replace(
      /CREATE EXTENSION IF NOT EXISTS "pgcrypto";\r?\n\r?\n/,
      ""
    )
  );
  await database.exec(`
    INSERT INTO "admin_users" ("id", "email", "password_hash", "full_name")
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@example.test',
      'legacy-hash',
      'Admin'
    );
    INSERT INTO "patients" ("id", "full_name", "whatsapp_phone", "birthdate")
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'Historical patient',
      '+10000000000',
      '1990-01-01'
    );
  `);

  await database.exec(
    await readFile(migrationPath("20260907000000_business_rules"), "utf8")
  );
  await database.exec(
    await readFile(
      migrationPath("20270101000000_align_users_to_supabase_auth"),
      "utf8"
    )
  );

  const historicalPatient = await database.query(`
    SELECT "user_id" FROM "patients"
    WHERE "id" = '00000000-0000-0000-0000-000000000002';
  `);
  assert.equal(historicalPatient.rows.length, 1);

  const generatedPatient = await database.query(`
    INSERT INTO "users" ("email", "full_name", "role")
    VALUES ('patient@directory.local', 'Patient', 'paciente')
    RETURNING "id", "auth_user_id";
  `);
  const generatedTherapist = await database.query(`
    INSERT INTO "users" ("email", "full_name", "role")
    VALUES ('therapist@directory.local', 'Therapist', 'psicologo')
    RETURNING "id", "auth_user_id";
  `);
  const patient = generatedPatient.rows[0] as {
    id: string;
    auth_user_id: string | null;
  };
  const therapist = generatedTherapist.rows[0] as {
    id: string;
    auth_user_id: string | null;
  };
  assert.notEqual(patient.id, "00000000-0000-0000-0000-000000000000");
  assert.notEqual(therapist.id, patient.id);
  assert.equal(patient.auth_user_id, null);
  assert.equal(therapist.auth_user_id, null);

  const authId = "00000000-0000-0000-0000-000000000900";
  await database.exec(`
    INSERT INTO auth.users ("id") VALUES ('${authId}');
    UPDATE "users"
    SET "auth_user_id" = '${authId}'
    WHERE "id" = '00000000-0000-0000-0000-000000000001';
  `);
  const linkedAdmin = await database.query(`
    SELECT "id", "auth_user_id"
    FROM "users"
    WHERE "username" = 'admin';
  `);
  assert.deepEqual(linkedAdmin.rows, [
    { id: "00000000-0000-0000-0000-000000000001", auth_user_id: authId }
  ]);
  const passwordColumn = await database.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'password_hash';
  `);
  assert.equal(passwordColumn.rows.length, 0);

  await database.exec(`DELETE FROM auth.users WHERE "id" = '${authId}';`);
  const retainedAdmin = await database.query(`
    SELECT "id", "auth_user_id" FROM "users" WHERE "username" = 'admin';
  `);
  assert.deepEqual(retainedAdmin.rows, [
    { id: "00000000-0000-0000-0000-000000000001", auth_user_id: null }
  ]);
});
