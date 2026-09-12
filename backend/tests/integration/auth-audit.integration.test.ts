import assert from "node:assert/strict";
import test from "node:test";

import express, { type RequestHandler } from "express";

import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";

const requestSession = {
  id: "00000000-0000-0000-0000-000000000001",
  jwtId: "00000000-0000-0000-0000-000000000002",
  expiresAt: new Date("2026-09-30T00:00:00.000Z"),
  user: {
    id: "00000000-0000-0000-0000-000000000003",
    email: "admin@saluddesdeelalma.org",
    fullName: "Jocelyn Gutiérrez",
    role: "admin" as const
  }
};

const authenticated: RequestHandler = (request, response, next) => {
  request.adminSession = requestSession;
  response.locals.requestId = "request-1";
  next();
};

const withServer = async (
  run: (baseUrl: string) => Promise<void>,
  failAction?: "refresh" | "revoke"
) => {
  const events: {
    auditEvents: Array<{
      action: string;
      actorUserId?: string;
      result: string;
      ipAddress?: string;
      userAgent?: string;
      requestId?: string;
    }>;
    revoked: boolean;
  } = { auditEvents: [], revoked: false };
  const app = express();
  app.use(
    createAuthRoutes({
      authenticate: authenticated,
      authorizeAdmin: (_request, _response, next) => next(),
      refreshAdminSessionWithAudit: async (input) => {
        if (failAction === "refresh") {
          throw new Error("audit transaction failed");
        }
        const audit = input.audit;
        events.auditEvents.push({
          action: audit.action,
          actorUserId: audit.actorUserId,
          result: audit.result,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          requestId: (audit.metadata as { requestId?: string }).requestId
        });
        return {
          session: {
            ...requestSession,
            user: requestSession.user
          },
          token: "refreshed-token"
        };
      },
      revokeAdminSessionWithAudit: async (input) => {
        if (failAction === "revoke") {
          throw new Error("audit transaction failed");
        }
        const audit = input.audit;
        events.auditEvents.push({
          action: audit.action,
          actorUserId: audit.actorUserId,
          result: audit.result,
          ipAddress: audit.ipAddress,
          userAgent: audit.userAgent,
          requestId: (audit.metadata as { requestId?: string }).requestId
        });
        events.revoked = true;
      }
    })
  );
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

test("successful session access and logout are audited", async () => {
  const events = await withServer(async (baseUrl) => {
    const me = await fetch(`${baseUrl}/me`, {
      headers: { "user-agent": "audit-test" }
    });
    assert.equal(me.status, 200);

    const logout = await fetch(`${baseUrl}/logout`, {
      method: "POST",
      headers: { "user-agent": "audit-test" }
    });
    assert.equal(logout.status, 204);
  });

  assert.equal(events.revoked, true);
  assert.deepEqual(
    events.auditEvents.map((event) => event.action),
    ["auth_session_accessed", "auth_logout"]
  );
  for (const event of events.auditEvents) {
    assert.equal(event.actorUserId, "00000000-0000-0000-0000-000000000003");
    assert.equal(event.result, "success");
    assert.match(event.ipAddress ?? "", /127\.0\.0\.1/);
    assert.equal(event.userAgent, "audit-test");
    assert.equal(event.requestId, "request-1");
  }
});

test("a failed audit transaction rejects the request without revoking a session", async () => {
  const events = await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/logout`, { method: "POST" });
    assert.equal(response.status, 500);
  }, "revoke");

  assert.equal(events.revoked, false);
  assert.deepEqual(events.auditEvents, []);
});
