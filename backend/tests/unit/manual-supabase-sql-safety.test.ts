import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";

const migrationPath = (name: string) =>
  fileURLToPath(new URL(`../../../database/migrations/${name}`, import.meta.url));

test("manual RLS SQL maps users through auth_user_id and removes client self-update policies", async () => {
  const sql = await readFile(migrationPath("rls_policies.sql"), "utf8");

  assert.match(sql, /using\s*\(auth_user_id\s*=\s*auth\.uid\(\)\)/i);
  assert.match(sql, /drop policy if exists "users_update_own_row"/i);
  assert.doesNotMatch(
    sql,
    /create policy\s+"users_update_own_row"[\s\S]*?for update/i
  );
  assert.doesNotMatch(
    sql,
    /create policy\s+"patients_update_own_record"[\s\S]*?for update/i
  );
  assert.match(sql, /users\.auth_user_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /users\.role\s*=\s*'admin'/i);
  assert.match(sql, /users\.panel_login_enabled/i);
  assert.doesNotMatch(sql, /auth\.jwt\(\)\s*->>\s*'role'\s*=\s*'admin'/i);
});

test("retired Auth schema SQL is non-executable and the proof bucket remains private", async () => {
  const authSql = await readFile(migrationPath("users_auth.sql"), "utf8");
  assert.match(authSql, /DO NOT EXECUTE/i);
  assert.doesNotMatch(authSql, /^\s*(create|alter|drop)\s+/im);

  const storageSql = await readFile(
    migrationPath("storage_payment_proofs.sql"),
    "utf8"
  );
  assert.match(storageSql, /create_bucket\('payment_proofs',\s*true\)/i);
  assert.doesNotMatch(storageSql, /create_public_url|create policy.*public/i);
});
