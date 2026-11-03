import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@prisma/client";

import {
  identifyAdminForLogin,
  type AdminLoginDependencies
} from "../../src/modules/auth/auth.service.js";
import type { SupabaseAuthResult } from "../../src/modules/auth/supabase-auth.service.js";

type LoginUser = Pick<
  User,
  | "id"
  | "authUserId"
  | "username"
  | "email"
  | "fullName"
  | "role"
  | "isActive"
  | "panelLoginEnabled"
>;

const userId = "11111111-1111-1111-1111-111111111111";
const authUserId = "22222222-2222-2222-2222-222222222222";
const adminUser: LoginUser = {
  id: userId,
  authUserId,
  username: "admin",
  email: "admin@test.com",
  fullName: "Admin",
  role: "admin",
  isActive: true,
  panelLoginEnabled: true
};

const dependenciesFor = (
  authResult: SupabaseAuthResult,
  user: LoginUser | null,
  lookups: string[] = []
): AdminLoginDependencies => ({
  authClient: {
    signInWithPassword: async () => authResult
  },
  findPublicUserByAuthId: async (id) => {
    lookups.push(id);
    return user?.authUserId === id ? user : null;
  }
});

test("Supabase y usuario público admin activo habilitado identifican al usuario", async () => {
  const lookups: string[] = [];
  const result = await identifyAdminForLogin(
    "admin@test.com",
    "local-password",
    dependenciesFor(
      { user: { id: authUserId }, error: null },
      adminUser,
      lookups
    )
  );

  assert.deepEqual(result, {
    status: "success",
    user: {
      id: userId,
      username: "admin",
      email: "admin@test.com",
      fullName: "Admin"
    }
  });
  assert.deepEqual(lookups, [authUserId]);
});

test("rechaza credenciales rechazadas por Supabase antes de consultar usuarios", async () => {
  const lookups: string[] = [];
  const result = await identifyAdminForLogin(
    "admin@test.com",
    "wrong-password",
    dependenciesFor(
      { user: null, error: new Error("invalid credentials") },
      adminUser,
      lookups
    )
  );

  assert.deepEqual(result, { status: "invalid_credentials" });
  assert.deepEqual(lookups, []);
});

test("rechaza la respuesta de Supabase sin identidad", async () => {
  const lookups: string[] = [];
  const result = await identifyAdminForLogin(
    "admin@test.com",
    "local-password",
    dependenciesFor({ user: null, error: null }, adminUser, lookups)
  );

  assert.deepEqual(result, { status: "invalid_credentials" });
  assert.deepEqual(lookups, []);
});

test("rechaza identidad de Supabase sin fila pública", async () => {
  const result = await identifyAdminForLogin(
    "missing@test.com",
    "local-password",
    dependenciesFor({ user: { id: authUserId }, error: null }, null)
  );

  assert.deepEqual(result, { status: "invalid_credentials" });
});

test("un usuario de dominio sin authUserId no es encontrado para login", async () => {
  const lookups: string[] = [];
  const result = await identifyAdminForLogin(
    "patient@test.com",
    "local-password",
    dependenciesFor(
      { user: { id: authUserId }, error: null },
      { ...adminUser, authUserId: null, role: "paciente" },
      lookups
    )
  );

  assert.deepEqual(result, { status: "invalid_credentials" });
  assert.deepEqual(lookups, [authUserId]);
});

for (const [description, publicUser] of [
  ["rol distinto de admin", { ...adminUser, role: "paciente" }],
  ["usuario inactivo", { ...adminUser, isActive: false }],
  ["login del panel deshabilitado", { ...adminUser, panelLoginEnabled: false }]
] satisfies Array<[string, LoginUser]>) {
  test(`rechaza fila pública con ${description}`, async () => {
    const result = await identifyAdminForLogin(
      "admin@test.com",
      "local-password",
      dependenciesFor({ user: { id: authUserId }, error: null }, publicUser)
    );

    assert.deepEqual(result, { status: "invalid_credentials" });
  });
}

test("metadata de usuario controlada por el cliente no concede acceso", async () => {
  const supabaseUser = Object.assign(
    { id: authUserId },
    {
      user_metadata: { role: "admin", panel_login_enabled: true },
      app_metadata: { role: "admin", panel_login_enabled: true }
    }
  );
  const result = await identifyAdminForLogin(
    "user@test.com",
    "local-password",
    dependenciesFor(
      { user: supabaseUser, error: null },
      { ...adminUser, role: "paciente", panelLoginEnabled: false }
    )
  );

  assert.deepEqual(result, { status: "invalid_credentials" });
});
