import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthorizeAdminIdentity } from "../../src/middleware/authorize-admin-identity.js";
import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";

type AuditEvent = {
  action: string;
  actorUserId?: string;
  entityType: string;
  result: string;
  requestId?: string;
  username?: string;
};

const loginResult = {
  status: "success" as const,
  user: {
    id: "00000000-0000-0000-0000-000000000003",
    username: "admin",
    email: "admin@saluddesdeelalma.org",
    fullName: "Jocelyn Gutiérrez"
  }
};

const withLoginServer = async (
  run: (baseUrl: string) => Promise<void>,
  options: {
    login?: typeof import("../../src/modules/auth/auth.service").identifyAdminForLogin;
    failSession?: boolean;
  } = {}
) => {
  const events: { audit: AuditEvent[] } = { audit: [] };
  const app = express();
  app.use(express.json());
  app.use(
    createAuthRoutes({
      login:
        options.login ??
        ((async () =>
          loginResult) as typeof import("../../src/modules/auth/auth.service").identifyAdminForLogin),
      createSession: (async (
        input: Parameters<
          typeof import("../../src/modules/auth/session.service").createAdminSessionWithAudit
        >[0]
      ) => {
        const audit = input.audit as AuditEvent;
        events.audit.push({
          action: audit.action,
          actorUserId: audit.actorUserId,
          entityType: audit.entityType,
          result: audit.result,
          requestId: (audit.metadata as { requestId?: string }).requestId,
          username: (audit.metadata as { username?: string }).username
        });

        if (options.failSession) {
          throw new Error("session insert failed");
        }

        return {
          session: {
            id: "00000000-0000-0000-0000-000000000001",
            jwtId: "00000000-0000-0000-0000-000000000002",
            expiresAt: new Date("2026-09-30T00:00:00.000Z"),
            user: loginResult.user
          },
          token: "signed-token"
        };
      }) as typeof import("../../src/modules/auth/session.service").createAdminSessionWithAudit,
      audit: (async (input) => {
        if (
          input.action !== "auth_login_failed" &&
          input.action !== "auth_login_forbidden_identity"
        ) {
          return;
        }
        events.audit.push({
          action: input.action,
          actorUserId: input.actorUserId,
          entityType: input.entityType,
          result: input.result,
          requestId: (input.metadata as { requestId?: string }).requestId,
          username: (input.metadata as { username?: string }).username
        });
      }) as typeof import("../../src/modules/audit/audit.service").audit
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

test("admin login with valid credentials creates a session and audits the event", async () => {
  const events = await withLoginServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "panel-test"
      },
      body: JSON.stringify({
        username: "admin",
        password: "secret-admin-password"
      })
    });
    assert.equal(response.status, 200);
    const setCookie = response.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /sda_admin_session=signed-token/);
    assert.match(setCookie, /HttpOnly/i);
    const body = (await response.json()) as {
      user: { id: string; username: string; role: string };
      expiresAt: string;
    };
    assert.equal(body.user.username, "admin");
    assert.equal(body.user.role, "admin");
    assert.ok(!Number.isNaN(Date.parse(body.expiresAt)));
  });

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["auth_login"]
  );
  assert.equal(events.audit[0].actorUserId, loginResult.user.id);
  assert.equal(events.audit[0].entityType, "admin_session");
  assert.equal(events.audit[0].result, "success");
});

test("failed login does not create a session and is audited", async () => {
  const events = await withLoginServer(
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "wrong-password" })
      });
      assert.equal(response.status, 401);
      const body = (await response.json()) as { code: string };
      assert.equal(body.code, "unauthorized");
    },
    {
      login: (async () => ({
        status: "invalid_credentials" as const
      })) as typeof import("../../src/modules/auth/auth.service").identifyAdminForLogin
    }
  );

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["auth_login_failed"]
  );
  assert.equal(events.audit[0].entityType, "auth_attempt");
  assert.equal(events.audit[0].result, "failure");
});

test("a non-admin identity is rejected and the attempt is audited", async () => {
  const events = await withLoginServer(
    async (baseUrl) => {
      const response = await fetch(`${baseUrl}/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: "jocelyn", password: "anything" })
      });
      assert.equal(response.status, 403);
      assert.equal(
        ((await response.json()) as { code: string }).code,
        "forbidden"
      );
    },
    {
      login: (async () => ({
        status: "forbidden_identity" as const,
        userId: "00000000-0000-0000-0000-000000000009"
      })) as typeof import("../../src/modules/auth/auth.service").identifyAdminForLogin
    }
  );

  assert.deepEqual(
    events.audit.map((event) => event.action),
    ["auth_login_forbidden_identity"]
  );
  assert.equal(
    events.audit[0].actorUserId,
    "00000000-0000-0000-0000-000000000009"
  );
  assert.equal(events.audit[0].entityType, "auth_attempt");
  assert.equal(events.audit[0].result, "failure");
});

test("invalid login payloads are rejected before any session is created", async () => {
  const events = await withLoginServer(async (baseUrl) => {
    const blank = await fetch(`${baseUrl}/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: "", password: "" })
    });
    assert.equal(blank.status, 400);
    assert.equal(
      ((await blank.json()) as { code: string }).code,
      "validation_error"
    );
  });

  assert.deepEqual(events.audit, []);
});

const requestSessionFor = (username: string) => ({
  id: "00000000-0000-0000-0000-000000000001",
  jwtId: "00000000-0000-0000-0000-000000000002",
  expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  user: {
    id: "00000000-0000-0000-0000-000000000003",
    username,
    email: `${username}@saluddesdeelalma.org`,
    fullName: "Perfil de Prueba",
    role: username === "admin" ? ("admin" as const) : ("psicologa" as const)
  }
});

const withIdentityServer = async (run: (baseUrl: string) => Promise<void>) => {
  const audit: AuditEvent[] = [];
  const app = express();
  app.use(express.json());
  app.use(
    createAuthRoutes({
      authenticate: (request, response, next) => {
        request.adminSession = requestSessionFor("jocelyn");
        response.locals.requestId = "request-1";
        next();
      },
      authorizeAdmin: createAuthorizeAdminIdentity((async (input) => {
        audit.push({
          action: input.action,
          actorUserId: input.actorUserId,
          entityType: input.entityType,
          result: input.result,
          requestId: (input.metadata as { requestId?: string }).requestId
        });
      }) as never),
      refreshAdminSessionWithAudit: (async () => {
        const session = requestSessionFor("jocelyn");
        return { session, token: "token-for-jocelyn" };
      }) as typeof import("../../src/modules/auth/session.service").refreshAdminSessionWithAudit,
      revokeAdminSessionWithAudit:
        (async () => {}) as typeof import("../../src/modules/auth/session.service").revokeAdminSessionWithAudit
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
    return audit;
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("a session issued to a non-admin username is denied without a cookie", async () => {
  const audit = await withIdentityServer(async (baseUrl) => {
    const me = await fetch(`${baseUrl}/me`);
    assert.equal(me.status, 403);
    assert.equal(((await me.json()) as { code: string }).code, "forbidden");
    const setCookie = me.headers.get("set-cookie");
    assert.equal(setCookie, null);

    const logout = await fetch(`${baseUrl}/logout`, { method: "POST" });
    assert.equal(logout.status, 403);
  });

  assert.deepEqual(
    audit.map((event) => event.action),
    ["auth_forbidden_identity", "auth_forbidden_identity"]
  );
  assert.equal(audit[0].actorUserId, "00000000-0000-0000-0000-000000000003");
  assert.equal(audit[0].entityType, "admin_session");
  assert.equal(audit[0].result, "failure");
  assert.equal(audit[0].requestId, "request-1");
});
