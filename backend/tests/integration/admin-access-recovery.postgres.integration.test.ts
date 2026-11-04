import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import express from "express";

import { errorHandler } from "../../src/middleware/error-handler.js";
import { prisma } from "../../src/lib/prisma.js";
import { createAuthRoutes } from "../../src/modules/auth/auth.routes.js";
import { identifyAdminForLogin } from "../../src/modules/auth/auth.service.js";
import type { SupabaseAuthClient } from "../../src/modules/auth/supabase-auth.service.js";
import {
  createAdminSession,
  validateAdminSessionToken
} from "../../src/modules/auth/session.service.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";
const recoveryToken = "fictitious-local-admin-recovery-token-32-characters";

test(
  "admin panel access can be recovered only by the authorized server action",
  { skip: !enabled },
  async (t) => {
    const authUserId = randomUUID();
    const email = `admin-recovery-${randomUUID()}@integration.local`;
    await prisma.$executeRaw`
      INSERT INTO auth.users (id) VALUES (${authUserId}::uuid)
    `;
    const user = await prisma.user.create({
      data: {
        username: "admin",
        email,
        fullName: "Admin de recuperación ficticio",
        role: "admin",
        authUserId,
        panelLoginEnabled: true
      }
    });
    const createdSession = await createAdminSession({ userId: user.id });

    t.after(async () => {
      await prisma.auditLog.deleteMany({
        where: {
          entityId: user.id,
          action: "auth_admin_access_reactivated"
        }
      });
      await prisma.adminSession.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$executeRaw`
        DELETE FROM auth.users WHERE id = ${authUserId}::uuid
      `;
      await prisma.$disconnect();
    });

    const authClient: SupabaseAuthClient = {
      signInWithPassword: async () => ({
        user: { id: authUserId, email },
        error: null
      })
    };
    const login = () =>
      identifyAdminForLogin(email, "fictitious-password", {
        authClient,
        findPublicUserByAuthId: (id) =>
          prisma.user.findUnique({
            where: { authUserId: id },
            select: {
              id: true,
              authUserId: true,
              username: true,
              email: true,
              fullName: true,
              role: true,
              isActive: true,
              panelLoginEnabled: true
            }
          })
      });

    assert.equal((await login()).status, "success");
    assert.ok(await validateAdminSessionToken(createdSession.token));

    await prisma.user.update({
      where: { id: user.id },
      data: { panelLoginEnabled: false }
    });

    assert.equal((await login()).status, "invalid_credentials");
    assert.equal(await validateAdminSessionToken(createdSession.token), null);

    const app = express();
    app.use(
      "/auth",
      createAuthRoutes({ adminAccessRecoveryToken: recoveryToken })
    );
    app.use(errorHandler);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");

    try {
      const denied = await fetch(
        `http://127.0.0.1:${address.port}/auth/admin-access/reactivate`,
        {
          method: "POST",
          headers: { authorization: "Bearer invalid-local-recovery-token" }
        }
      );
      assert.equal(denied.status, 401);
      assert.equal(
        (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
          .panelLoginEnabled,
        false
      );

      const recovered = await fetch(
        `http://127.0.0.1:${address.port}/auth/admin-access/reactivate`,
        {
          method: "POST",
          headers: { authorization: `Bearer ${recoveryToken}` }
        }
      );
      assert.equal(recovered.status, 204);
      assert.doesNotMatch(
        recovered.headers.get("set-cookie") ?? "",
        new RegExp(recoveryToken)
      );
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }

    assert.equal(
      (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
        .panelLoginEnabled,
      true
    );
    assert.equal(await validateAdminSessionToken(createdSession.token), null);
    assert.equal((await login()).status, "success");
    const revokedSession = await prisma.adminSession.findUniqueOrThrow({
      where: { id: createdSession.session.id }
    });
    assert.ok(revokedSession.revokedAt);
    assert.equal(
      await prisma.auditLog.count({
        where: {
          entityId: user.id,
          action: "auth_admin_access_reactivated",
          actorChannel: "system",
          result: "success"
        }
      }),
      1
    );
  }
);
