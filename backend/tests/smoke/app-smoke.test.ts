import assert from "node:assert/strict";
import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { createServer as createHttpServer } from "node:http";
import { createRequire } from "node:module";
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync
} from "node:fs";
import { createServer } from "node:net";
import path from "node:path";
import test from "node:test";

import express from "express";

import { AppError, errorHandler } from "../../src/middleware/error-handler.js";
import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";
import type { identifyAdminForLogin } from "../../src/modules/auth/auth.service.js";
import type {
  createAdminSessionWithAudit,
  refreshAdminSessionWithAudit,
  revokeAdminSessionWithAudit
} from "../../src/modules/auth/session.service.js";
import { createWhatsAppGateway } from "../../src/integrations/whatsapp/whatsapp.gateway.js";
import { processIncomingWhatsAppInbox } from "../../src/jobs/process-whatsapp-inbox.job.js";

const delay = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));
const require = createRequire(import.meta.url);
const { createRequestHandler } = require("../../../server.cjs");

const getAvailablePort = async () => {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error(
      "Could not reserve a local port for the frontend smoke test"
    );
  }

  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return address.port;
};

const makeEnvironmentFreeFrontendCopy = (repositoryRoot: string) => {
  const temporaryDirectory = mkdtempSync(
    path.join(repositoryRoot, ".smoke-frontend-")
  );
  const files = execFileSync("git", ["ls-files", "-z", "--", "frontend"], {
    cwd: repositoryRoot,
    encoding: "utf8"
  })
    .split("\0")
    .filter(Boolean);

  for (const file of files) {
    const relativePath = path.relative("frontend", file);
    const segments = relativePath.split(path.sep);
    if (
      segments.some(
        (segment) =>
          segment === "node_modules" ||
          segment === ".next" ||
          segment.startsWith(".env")
      )
    ) {
      continue;
    }

    const destination = path.join(temporaryDirectory, relativePath);
    mkdirSync(path.dirname(destination), { recursive: true });
    copyFileSync(path.join(repositoryRoot, file), destination);
  }

  return temporaryDirectory;
};

const stopOwnedProcess = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  child.kill();
  await Promise.race([once(child, "exit"), delay(5_000)]);
  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await once(child, "exit");
  }
};

const removeTemporaryDirectory = (directory: string) => {
  const makeWritable = (currentPath: string) => {
    const stats = lstatSync(currentPath);
    if (stats.isDirectory()) {
      for (const entry of readdirSync(currentPath)) {
        makeWritable(path.join(currentPath, entry));
      }
    }
    chmodSync(currentPath, stats.isDirectory() ? 0o700 : 0o600);
  };

  makeWritable(directory);
  rmSync(directory, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 500
  });
};

test(
  "local frontend serves the home page without loading environment files",
  { timeout: 120_000 },
  async () => {
    const repositoryRoot = process.env.SMOKE_REPOSITORY_ROOT;
    assert.ok(repositoryRoot, "smoke runner must provide the repository root");
    const temporaryDirectory = makeEnvironmentFreeFrontendCopy(repositoryRoot);
    const port = await getAvailablePort();
    const nextCli = path.join(
      repositoryRoot,
      "node_modules",
      "next",
      "dist",
      "bin",
      "next"
    );
    const child = spawn(
      process.execPath,
      [nextCli, "dev", "--hostname", "127.0.0.1", "--port", String(port)],
      {
        cwd: temporaryDirectory,
        env: {
          ...process.env,
          NODE_ENV: "development",
          NEXT_TELEMETRY_DISABLED: "1"
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let startupError = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      startupError = `${startupError}${chunk.toString()}`.slice(-2_000);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      startupError = `${startupError}${chunk.toString()}`.slice(-2_000);
    });

    try {
      const url = `http://127.0.0.1:${port}/`;
      const startedAt = Date.now();
      let response: Response | undefined;

      while (Date.now() - startedAt < 90_000) {
        if (child.exitCode !== null) {
          throw new Error(
            `Local frontend exited before becoming ready: ${startupError}`
          );
        }

        try {
          response = await fetch(url, {
            signal: AbortSignal.timeout(60_000)
          });
          if (response.ok || response.status >= 500) {
            break;
          }
        } catch {
          await delay(500);
        }
      }

      assert.ok(response, "local frontend did not respond before timeout");
      const html = await response.text();
      assert.equal(
        response.status,
        200,
        `Local frontend returned an error: ${startupError}\n${html.slice(0, 1_000)}`
      );
      assert.match(html, /<html\b/i);
      assert.match(html, /Salud desde el Alma/);
    } finally {
      await stopOwnedProcess(child);
      await delay(500);
      removeTemporaryDirectory(temporaryDirectory);
    }
  }
);

test("synthetic admin can log in, access the session, and log out locally", async () => {
  const user = {
    id: "00000000-0000-4000-8000-000000000001",
    username: "smoke-admin",
    email: "smoke-admin@example.invalid",
    fullName: "Synthetic Smoke Admin",
    role: "admin" as const
  };
  const cookieName = "sda_admin_session";
  const token = "synthetic-smoke-session-token";
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  let revoked = false;
  const app = express();
  app.use(express.json());
  app.use(
    "/api/v1/auth",
    createAuthRoutes({
      login: (async (email: string, password: string) =>
        email === user.email && password === "synthetic-smoke-password"
          ? { status: "success" as const, user }
          : {
              status: "invalid_credentials" as const
            }) as typeof identifyAdminForLogin,
      authenticate: (request, _response, next) => {
        const cookie = request.header("cookie") ?? "";
        if (revoked || !cookie.includes(`${cookieName}=${token}`)) {
          request.adminSession = undefined;
          next(new AppError(401, "unauthorized", "Authentication required"));
          return;
        }
        request.adminSession = {
          id: "00000000-0000-4000-8000-000000000002",
          jwtId: "00000000-0000-4000-8000-000000000003",
          expiresAt,
          user
        };
        next();
      },
      authorizeAdmin: (_request, _response, next) => next(),
      createSession: (async () => ({
        session: { expiresAt, user },
        token
      })) as typeof createAdminSessionWithAudit,
      refreshAdminSessionWithAudit: (async () => ({
        session: {
          id: "00000000-0000-4000-8000-000000000002",
          userId: user.id,
          jwtId: "00000000-0000-4000-8000-000000000003",
          expiresAt,
          revokedAt: null,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            fullName: user.fullName,
            role: user.role
          }
        },
        token
      })) as typeof refreshAdminSessionWithAudit,
      revokeAdminSessionWithAudit: (async () => {
        revoked = true;
      }) as typeof revokeAdminSessionWithAudit
    })
  );
  app.use(errorHandler);

  const server = createHttpServer(
    createRequestHandler(
      app,
      (_request: unknown, response: import("node:http").ServerResponse) =>
        response.end("frontend"),
      () => {
        throw new Error("Unexpected frontend error");
      }
    )
  ).listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  try {
    const login = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        password: "synthetic-smoke-password"
      })
    });
    assert.equal(login.status, 200);
    const loginBody = await login.text();
    assert.match(loginBody, /smoke-admin@example\.invalid/);
    assert.equal(loginBody.includes(token), false);
    const setCookie = login.headers.get("set-cookie") ?? "";
    assert.ok(setCookie.includes(`${cookieName}=${token}`));
    assert.match(setCookie, /HttpOnly/i);
    const cookie = setCookie.split(";", 1)[0];
    assert.ok(cookie);

    const me = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie }
    });
    assert.equal(me.status, 200);
    const sessionBody = await me.text();
    assert.match(sessionBody, /smoke-admin@example\.invalid/);
    assert.equal(sessionBody.includes(token), false);

    const logout = await fetch(`${baseUrl}/api/v1/auth/logout`, {
      method: "POST",
      headers: { cookie }
    });
    assert.equal(logout.status, 204);
    assert.equal(
      (logout.headers.get("set-cookie") ?? "").includes(token),
      false
    );

    const afterLogout = await fetch(`${baseUrl}/api/v1/auth/me`, {
      headers: { cookie }
    });
    assert.equal(afterLogout.status, 401);
    assert.equal((await afterLogout.text()).includes(token), false);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("real Prisma smoke check is restricted to an explicit disposable local database", async (context) => {
  const databaseUrl = process.env.SMOKE_DATABASE_URL;
  if (!databaseUrl) {
    context.skip(
      "No SMOKE_DATABASE_URL; database coverage uses the Prisma mock health contract"
    );
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const client = new PrismaClient({ datasourceUrl: databaseUrl });
  try {
    const result = await client.$queryRaw<
      Array<{ result: number }>
    >`SELECT 1 AS result`;
    assert.deepEqual(result, [{ result: 1 }]);
  } finally {
    await client.$disconnect();
  }
});

test("disabled WhatsApp switch blocks HTTP and leaves the outbox event pending", async () => {
  let httpCalls = 0;
  let markedSent = false;
  let released = false;
  const outgoingEvent = {
    id: "smoke-outgoing-event",
    processingToken: "synthetic-processing-token",
    attemptsCount: 2,
    whatsappPhone: "5215550000000",
    contentText: "Synthetic smoke message",
    conversationId: "smoke-conversation",
    intent: "book" as const,
    status: "pendiente" as const
  };
  const gateway = createWhatsAppGateway({
    outboundEnabled: process.env.WHATSAPP_OUTBOUND_ENABLED === "true",
    accessToken: "synthetic-access-token",
    phoneNumberId: "synthetic-phone-id",
    fetch: async () => {
      httpCalls += 1;
      return new Response();
    }
  });

  await processIncomingWhatsAppInbox({
    claimIncoming: async () => [] as never,
    claimOutgoing: async () => [outgoingEvent] as never,
    releaseOutgoing: async () => {
      released = true;
      return { count: 1 } as never;
    },
    markOutgoingSent: async () => {
      markedSent = true;
      return { count: 1 } as never;
    },
    markOutgoingFailed: async () => ({ count: 1 }) as never,
    saveOutboundMessage: async () => ({}) as never,
    gateway
  });

  assert.equal(httpCalls, 0);
  assert.equal(markedSent, false);
  assert.equal(released, true);
  assert.equal(outgoingEvent.status, "pendiente");
  assert.equal(outgoingEvent.attemptsCount, 2);
});
