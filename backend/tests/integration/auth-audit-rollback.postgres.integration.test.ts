import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { prisma } from "../../src/lib/prisma.js";
import {
  refreshAdminSessionWithAudit,
  revokeAdminSessionWithAudit
} from "../../src/modules/auth/session.service.js";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "true";

test(
  "audit insert failure rolls back session refresh and revocation",
  { skip: !enabled },
  async (t) => {
    const authUserId = randomUUID();
    const email = `admin-audit-${randomUUID()}@integration.local`;
    const triggerSuffix = randomUUID().replaceAll("-", "");
    const triggerName = `audit_fail_${triggerSuffix}`;
    const functionName = `fail_audit_${triggerSuffix}`;
    await prisma.$executeRaw`
      INSERT INTO auth.users (id) VALUES (${authUserId}::uuid)
    `;
    const user = await prisma.user.create({
      data: {
        username: "admin",
        email,
        fullName: "Audit Test",
        role: "admin",
        authUserId,
        panelLoginEnabled: true
      }
    });
    const session = await prisma.adminSession.create({
      data: {
        userId: user.id,
        jwtId: "00000000-0000-0000-0000-000000000001",
        expiresAt: new Date(Date.now() + 60 * 60_000)
      }
    });
    const originalLastActivityAt = session.lastActivityAt;

    t.after(async () => {
      await prisma.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "audit_logs"`
      );
      await prisma.$executeRawUnsafe(
        `DROP FUNCTION IF EXISTS "${functionName}"()`
      );
      await prisma.adminSession.delete({ where: { id: session.id } });
      await prisma.user.delete({ where: { id: user.id } });
      await prisma.$executeRaw`
        DELETE FROM auth.users WHERE id = ${authUserId}::uuid
      `;
      await prisma.$disconnect();
    });

    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION "${functionName}"() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        RAISE EXCEPTION 'forced audit failure';
      END;
      $$
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER "${triggerName}"
      BEFORE INSERT ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
    `);

    const audit = {
      actorUserId: user.id,
      actorChannel: "admin_panel" as const,
      action: "test",
      entityType: "admin_session",
      entityId: session.id,
      result: "success" as const
    };

    await assert.rejects(
      refreshAdminSessionWithAudit({ sessionId: session.id, audit }),
      /forced audit failure/
    );
    await assert.rejects(
      revokeAdminSessionWithAudit({ sessionId: session.id, audit }),
      /forced audit failure/
    );

    const unchanged = await prisma.adminSession.findUniqueOrThrow({
      where: { id: session.id }
    });
    assert.equal(unchanged.revokedAt, null);
    assert.equal(
      unchanged.lastActivityAt.getTime(),
      originalLastActivityAt.getTime()
    );
  }
);
