import assert from "node:assert/strict";
import test from "node:test";

import type { User } from "@prisma/client";
import express from "express";

import { createApp } from "../../src/app.js";
import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";
import {
  identifyAdminForLogin,
  type AdminLoginResult
} from "../../src/modules/auth/auth.service.js";
import type { AuditCreateInput } from "../../src/modules/audit/audit.repository.js";
import type {
  SupabaseAuthClient,
  SupabaseAuthResult
} from "../../src/modules/auth/supabase-auth.service.js";
import { createAdminSessionWithAudit } from "../../src/modules/auth/session.service.js";

type LoginUser = Pick<
  User,
  | "id"
  | "username"
  | "email"
  | "fullName"
  | "role"
  | "isActive"
  | "panelLoginEnabled"
>;

type LoginScenario = {
  authResult: SupabaseAuthResult;
  publicUser: LoginUser | null;
};

const userId = "00000000-0000-0000-0000-000000000001";
const attemptEmail = "attempt.secret@example.com";
const attemptPassword = "password-never-audited";

const adminUser: LoginUser = {
  id: userId,
  username: "admin",
  email: "admin@example.com",
  fullName: "Admin",
  role: "admin",
  isActive: true,
  panelLoginEnabled: true
};

const successfulAuth = (id = userId): SupabaseAuthResult => ({
  user: { id, email: "admin@example.com" },
  error: null
});

const withLoginServer = async (
  scenario: LoginScenario,
  run: (baseUrl: string) => Promise<void>
) => {
  const events = {
    sessionCreations: 0,
    audits: [] as AuditCreateInput[],
    authCredentials: [] as Array<{ email: string; password: string }>,
    publicUserLookups: [] as string[]
  };
  const authClient: SupabaseAuthClient = {
    signInWithPassword: async (credentials) => {
      events.authCredentials.push(credentials);
      return scenario.authResult;
    }
  };
  const login = (email: string, password: string): Promise<AdminLoginResult> =>
    identifyAdminForLogin(email, password, {
      authClient,
      findPublicUserById: async (id) => {
        events.publicUserLookups.push(id);
        return scenario.publicUser;
      }
    });

  const app = express();
  app.use(express.json());
  app.use(
    createAuthRoutes({
      login,
      createSession: async (
        input: Parameters<typeof createAdminSessionWithAudit>[0]
      ) => {
        events.sessionCreations += 1;
        events.audits.push(input.audit);
        return {
          session: {
            expiresAt: new Date("2026-12-31T00:00:00.000Z"),
            user: {
              id: input.userId,
              username: adminUser.username,
              email: adminUser.email,
              fullName: adminUser.fullName,
              role: adminUser.role
            }
          },
          token: "local-test-session-token"
        };
      },
      audit: async (input) => {
        events.audits.push(input);
      }
    })
  );
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
    return events;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("Supabase Auth + public admin habilitado crean sesión y cookie HttpOnly", async () => {
  const scenario: LoginScenario = {
    authResult: successfulAuth(),
    publicUser: adminUser
  };
  const events = await withLoginServer(scenario, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: attemptEmail, password: attemptPassword })
    });

    assert.equal(response.status, 200);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /sda_admin_session=local-test-session-token/);
    assert.match(cookie, /HttpOnly/i);
    const body = (await response.json()) as {
      user: { id: string; role: string };
    };
    assert.equal(body.user.id, userId);
    assert.equal(body.user.role, "admin");
  });

  assert.deepEqual(events.authCredentials, [
    { email: attemptEmail, password: attemptPassword }
  ]);
  assert.deepEqual(events.publicUserLookups, [userId]);
  assert.equal(events.sessionCreations, 1);
  assert.equal(events.audits[0]?.action, "auth_login");
  const auditText = JSON.stringify(events.audits);
  assert.equal(auditText.includes(attemptEmail), false);
  assert.equal(auditText.includes(attemptPassword), false);
  assert.equal(auditText.includes("local-test-session-token"), false);
});

const denialScenarios: Array<{ name: string; scenario: LoginScenario }> = [
  {
    name: "credenciales rechazadas por Supabase",
    scenario: {
      authResult: { user: null, error: new Error("invalid credentials") },
      publicUser: adminUser
    }
  },
  {
    name: "respuesta de Supabase sin identidad",
    scenario: { authResult: { user: null, error: null }, publicUser: adminUser }
  },
  {
    name: "identidad válida sin fila pública",
    scenario: { authResult: successfulAuth(), publicUser: null }
  },
  {
    name: "fila pública con rol distinto de admin",
    scenario: {
      authResult: successfulAuth(),
      publicUser: { ...adminUser, role: "paciente" }
    }
  },
  {
    name: "fila pública inactiva",
    scenario: {
      authResult: successfulAuth(),
      publicUser: { ...adminUser, isActive: false }
    }
  },
  {
    name: "login de panel deshabilitado",
    scenario: {
      authResult: successfulAuth(),
      publicUser: { ...adminUser, panelLoginEnabled: false }
    }
  },
  {
    name: "metadata controlada por el cliente no eleva una fila pública",
    scenario: {
      authResult: {
        user: Object.assign(
          { id: userId, email: "admin@example.com" },
          {
            user_metadata: { role: "admin", panel_login_enabled: true },
            app_metadata: { role: "admin", panel_login_enabled: true }
          }
        ),
        error: null
      },
      publicUser: {
        ...adminUser,
        role: "paciente",
        panelLoginEnabled: false
      }
    }
  }
];

for (const { name, scenario } of denialScenarios) {
  test(`${name}: 401 genérico sin sesión ni cookie`, async () => {
    const events = await withLoginServer(scenario, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: attemptEmail, password: attemptPassword })
      });
      const body = (await response.json()) as {
        code: string;
        message: string;
      };

      assert.equal(response.status, 401);
      assert.deepEqual(
        { code: body.code, message: body.message },
        {
          code: "unauthorized",
          message: "Usuario o contraseña incorrectos"
        }
      );
      assert.equal(response.headers.get("set-cookie"), null);
    });

    assert.equal(events.sessionCreations, 0);
    assert.equal(events.audits.length, 1);
    const auditText = JSON.stringify(events.audits);
    assert.equal(auditText.includes(attemptEmail), false);
    assert.equal(auditText.includes(attemptPassword), false);
    assert.equal(auditText.includes("local-test-session-token"), false);
  });
}

test("POST /api/v1/auth/login aplica el rate limit montado", async () => {
  const app = createApp();
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    const statuses: number[] = [];
    let finalBody: { code?: string } = {};
    for (let attempt = 0; attempt < 11; attempt += 1) {
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/v1/auth/login`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({})
        }
      );
      statuses.push(response.status);
      if (attempt === 10) {
        finalBody = (await response.json()) as { code?: string };
      } else {
        await response.body?.cancel();
      }
    }

    assert.deepEqual(
      statuses,
      [400, 400, 400, 400, 400, 400, 400, 400, 400, 400, 429]
    );
    assert.equal(finalBody.code, "rate_limit_exceeded");
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
