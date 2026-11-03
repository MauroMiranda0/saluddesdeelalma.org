import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import {
  createAuthenticate
} from "../../src/middleware/authenticate.js";
import {
  errorHandler
} from "../../src/middleware/error-handler.js";
import {
  InvalidAdminSessionError,
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  validateAdminSessionToken,
  type AdminSessionRecord
} from "../../src/modules/auth/session.service.js";

const payload = {
  sessionId: "session-1",
  userId: "user-1",
  jwtId: "jwt-1"
};

const validSession = (): AdminSessionRecord => ({
  id: payload.sessionId,
  userId: payload.userId,
  jwtId: payload.jwtId,
  expiresAt: new Date(Date.now() + 60_000),
  revokedAt: null,
  user: {
    id: payload.userId,
    authUserId: "auth-user-1",
    username: "admin",
    role: "admin",
    isActive: true,
    panelLoginEnabled: true
  }
});

const validateWithSession = (session: AdminSessionRecord | null) =>
  validateAdminSessionToken("signed-test-token", {
    verifyToken: async () => payload,
    findSession: async () => session
  });

test("existing session is rejected when admin access or its Auth link changes", async () => {
  const changes: Array<[string, (session: AdminSessionRecord) => void]> = [
    ["panel login disabled", (session) => (session.user.panelLoginEnabled = false)],
    ["user inactive", (session) => (session.user.isActive = false)],
    ["admin role removed", (session) => (session.user.role = "paciente")],
    ["Auth identity unlinked", (session) => (session.user.authUserId = null)],
    ["admin username changed", (session) => (session.user.username = "other")]
  ];

  for (const [description, change] of changes) {
    const session = validSession();
    change(session);
    assert.equal(await validateWithSession(session), null, description);
  }
});

test("revoked and expired sessions are rejected and a valid linked admin passes", async () => {
  const revoked = validSession();
  revoked.revokedAt = new Date();
  assert.equal(await validateWithSession(revoked), null);

  const expired = validSession();
  expired.expiresAt = new Date(Date.now() - 1);
  assert.equal(await validateWithSession(expired), null);

  assert.ok(await validateWithSession(validSession()));
});

test("disabled, inactive, non-admin, unlinked, revoked, and expired sessions are denied and cleared", async () => {
  let current = validSession();
  let protectedCalls = 0;
  let slideCalls = 0;
  const app = express();
  app.use(
    createAuthenticate({
      validateToken: (token) =>
        validateAdminSessionToken(token, {
          verifyToken: async () => payload,
          findSession: async () => current
        }),
      slideSession: async () => {
        slideCalls += 1;
        throw new Error("should not slide invalid session");
      },
      auditDeniedAccess: async () => {}
    })
  );
  app.get("/sensitive", (_request, response) => {
    protectedCalls += 1;
    response.sendStatus(204);
  });
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    const invalidStates: Array<(session: AdminSessionRecord) => void> = [
      (session) => (session.user.panelLoginEnabled = false),
      (session) => (session.user.isActive = false),
      (session) => (session.user.role = "paciente"),
      (session) => (session.user.authUserId = null),
      (session) => (session.revokedAt = new Date()),
      (session) => (session.expiresAt = new Date(Date.now() - 1))
    ];

    for (const invalidate of invalidStates) {
      current = validSession();
      invalidate(current);
      const response = await fetch(
        `http://127.0.0.1:${address.port}/sensitive`,
        { headers: { cookie: "sda_admin_session=signed-test-token" } }
      );

      assert.equal(response.status, 401);
      assert.match(
        response.headers.get("set-cookie") ?? "",
        /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i
      );
    }

    assert.equal(protectedCalls, 0);
    assert.equal(slideCalls, 0);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("session cookie is host-only, HttpOnly, SameSite=Lax, Secure in production, and cleared with matching attributes", () => {
  const production = { NODE_ENV: "production" as const, SESSION_IDLE_TIMEOUT_MINUTES: 30 };
  const options = getSessionCookieOptions(production);
  const clearOptions = getClearSessionCookieOptions(production);

  assert.equal(options.httpOnly, true);
  assert.equal(options.secure, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.equal(options.maxAge, 30 * 60_000);
  assert.equal("domain" in options, false);
  assert.equal(clearOptions.httpOnly, true);
  assert.equal(clearOptions.secure, true);
  assert.equal(clearOptions.sameSite, options.sameSite);
  assert.equal(clearOptions.path, options.path);
  assert.equal("domain" in clearOptions, false);
});

test("a session revoked between validation and sliding is denied without renewal", async () => {
  const app = express();
  app.use(
    createAuthenticate({
      validateToken: async () => ({
        session: validSession(),
        token: "signed-test-token"
      }),
      slideSession: async () => {
        throw new InvalidAdminSessionError("revoked");
      },
      auditDeniedAccess: async () => {}
    })
  );
  app.get("/sensitive", (_request, response) => response.sendStatus(204));
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/sensitive`, {
      headers: { cookie: "sda_admin_session=signed-test-token" }
    });

    assert.equal(response.status, 401);
    const cookie = response.headers.get("set-cookie") ?? "";
    assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i);
    assert.doesNotMatch(cookie, /signed-test-token/);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});
