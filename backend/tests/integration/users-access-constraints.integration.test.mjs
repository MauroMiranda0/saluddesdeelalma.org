import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PGlite } from "@electric-sql/pglite";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const backendDirectory = join(testsDirectory, "..", "..");
const initialMigration = join(
  backendDirectory,
  "prisma",
  "migrations",
  "20260904000000_initial",
  "migration.sql"
);
const businessRulesMigration = join(
  backendDirectory,
  "prisma",
  "migrations",
  "20260907000000_business_rules",
  "migration.sql"
);

const applyMigration = async (database, migrationPath) => {
  await database.exec(await readFile(migrationPath, "utf8"));
};

const applyInitialMigration = async (database) => {
  const migration = await readFile(initialMigration, "utf8");

  // PGlite does not bundle pgcrypto; the migrations only need its UUID default.
  await database.exec(`
    CREATE FUNCTION gen_random_uuid() RETURNS uuid LANGUAGE SQL AS $$
      SELECT '00000000-0000-0000-0000-000000000003'::uuid;
    $$;
  `);
  await database.exec(
    migration.replace(
      /CREATE EXTENSION IF NOT EXISTS "pgcrypto";\r?\n\r?\n/,
      ""
    )
  );
};

test("business rules preserve the sole admin and disable panel login for directory profiles", async (t) => {
  const database = new PGlite();
  t.after(() => database.close());

  await applyInitialMigration(database);
  await database.exec(`
    INSERT INTO "admin_users" ("id", "email", "password_hash", "full_name")
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      'admin@saluddesdeelalma.org',
      'legacy-password-hash',
      'Jocelyn Gutiérrez'
    );
    INSERT INTO "patients" ("id", "full_name", "whatsapp_phone", "birthdate")
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      'Paciente de directorio',
      '+525500000000',
      '1990-01-01'
    );
  `);
  await applyMigration(database, businessRulesMigration);

  const admin = await database.query(
    'SELECT "username", "panel_login_enabled" FROM "users" WHERE "role" = \'admin\''
  );
  const patientProfile = await database.query(
    'SELECT "user_id" FROM "patients" WHERE "id" = \'00000000-0000-0000-0000-000000000002\''
  );

  assert.deepEqual(admin.rows, [
    { username: "admin", panel_login_enabled: true }
  ]);
  assert.equal(patientProfile.rows.length, 1);
  assert.ok(patientProfile.rows[0].user_id);

  await assert.rejects(
    database.exec(`
      INSERT INTO "users" (
        "id", "username", "email", "password_hash", "full_name", "role", "panel_login_enabled"
      ) VALUES (
        '00000000-0000-0000-0000-000000000004',
        'admin',
        'second-admin@saluddesdeelalma.org',
        'another-password-hash',
        'Second admin',
        'admin',
        true
      );
    `),
    /duplicate key|unique/i
  );

  await database.exec(`
    INSERT INTO "users" ("id", "email", "full_name", "role")
    VALUES (
      '00000000-0000-0000-0000-000000000005',
      'psicologa@saluddesdeelalma.org',
      'Perfil directorio',
      'psicologo'
    );
  `);
  await assert.rejects(
    database.exec(`
      UPDATE "users"
      SET "panel_login_enabled" = true
      WHERE "email" = 'psicologa@saluddesdeelalma.org';
    `),
    /users_access_profile_check|check constraint/i
  );
});
