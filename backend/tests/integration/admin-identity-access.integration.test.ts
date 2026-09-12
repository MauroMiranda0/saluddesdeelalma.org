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

const applyInitialMigration = async (database: {
  exec(input: string): Promise<unknown>;
}) => {
  const migration = await readFile(initialMigration, "utf8");

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

test("the only panel-enabled identity is the single admin username", async (t) => {
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
  `);
  await database.exec(await readFile(businessRulesMigration, "utf8"));

  const enabled = await database.query(`
    SELECT "username", "role", "panel_login_enabled"
    FROM "users"
    WHERE "panel_login_enabled" = true;
  `);

  assert.deepEqual(enabled.rows, [
    { username: "admin", role: "admin", panel_login_enabled: true }
  ]);
});

test("a psychologist identity cannot enable panel login or adopt the admin role", async (t) => {
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
  `);
  await database.exec(await readFile(businessRulesMigration, "utf8"));
  await database.exec(`
    INSERT INTO "users" ("id", "email", "full_name", "role")
    VALUES (
      '00000000-0000-0000-0000-000000000005',
      'jocelyn@saluddesdeelalma.org',
      'Psicóloga Jocelyn',
      'psicologo'
    );
  `);

  await assert.rejects(
    database.exec(`
      UPDATE "users"
      SET "username" = 'jocelyn', "panel_login_enabled" = true
      WHERE "id" = '00000000-0000-0000-0000-000000000005';
    `),
    /users_access_profile_check|check constraint/i
  );

  await assert.rejects(
    database.exec(`
      UPDATE "users"
      SET
        "role" = 'admin',
        "username" = 'admin',
        "panel_login_enabled" = true,
        "password_hash" = 'another-password-hash'
      WHERE "id" = '00000000-0000-0000-0000-000000000005';
    `),
    /users_single_admin_key|duplicate key/i
  );
});

test("an identity denial is persisted for the admin audit trail", async (t) => {
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
  `);
  await database.exec(await readFile(businessRulesMigration, "utf8"));
  await database.exec(`
    INSERT INTO "users" ("id", "email", "full_name", "role")
    VALUES (
      '00000000-0000-0000-0000-000000000005',
      'jocelyn@saluddesdeelalma.org',
      'Psicóloga Jocelyn',
      'psicologo'
    );
  `);
  await database.exec(`
    INSERT INTO "audit_logs" (
      "id", "actor_user_id", "actor_channel", "action", "entity_type", "result"
    ) VALUES (
      '00000000-0000-0000-0000-000000000006',
      '00000000-0000-0000-0000-000000000005',
      'admin_panel',
      'auth_forbidden_identity',
      'admin_session',
      'failure'
    );
  `);

  const denials = await database.query(`
    SELECT "actor_user_id", "action", "entity_type", "result"
    FROM "audit_logs"
    WHERE "action" = 'auth_forbidden_identity';
  `);

  assert.deepEqual(denials.rows, [
    {
      actor_user_id: "00000000-0000-0000-0000-000000000005",
      action: "auth_forbidden_identity",
      entity_type: "admin_session",
      result: "failure"
    }
  ]);
});
