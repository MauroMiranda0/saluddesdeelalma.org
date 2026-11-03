import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
import {
  auditLogCreateData,
  type AuditCreateInput
} from "../audit/audit.repository";
import {
  createJwtId,
  signAdminSessionToken,
  verifyAdminSessionToken
} from "./token.service";

const getSessionExpiry = () => {
  return new Date(Date.now() + env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000);
};

export type AdminSessionRecord = {
  id: string;
  userId: string;
  jwtId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: {
    id: string;
    authUserId: string | null;
    username: string | null;
    role: string;
    isActive: boolean;
    panelLoginEnabled: boolean;
  };
};

export const isEligibleAdminSession = (
  session: AdminSessionRecord | null,
  payload: { sessionId: string; userId: string; jwtId: string },
  now = Date.now()
) =>
  Boolean(
    session &&
      session.id === payload.sessionId &&
      session.userId === payload.userId &&
      session.user.id === payload.userId &&
      session.jwtId === payload.jwtId &&
      !session.revokedAt &&
      session.expiresAt.getTime() > now &&
      session.user.authUserId &&
      session.user.isActive &&
      session.user.panelLoginEnabled &&
      session.user.role === "admin" &&
      session.user.username === "admin"
  );

export class InvalidAdminSessionError extends Error {}

export const createAdminSession = async (input: {
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}) => {
  const jwtId = createJwtId();
  const expiresAt = getSessionExpiry();
  const session = await prisma.adminSession.create({
    data: {
      userId: input.userId,
      jwtId,
      expiresAt,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent
    },
    include: { user: true }
  });
  const token = await signAdminSessionToken(
    { userId: input.userId, sessionId: session.id, jwtId },
    expiresAt
  );

  return { session, token };
};

export const createAdminSessionWithAudit = async (input: {
  userId: string;
  audit: AuditCreateInput;
  ipAddress?: string;
  userAgent?: string;
}) => {
  const jwtId = createJwtId();
  const expiresAt = getSessionExpiry();
  const session = await prisma.$transaction(async (transaction) => {
    const created = await transaction.adminSession.create({
      data: {
        userId: input.userId,
        jwtId,
        expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent
      },
      include: { user: true }
    });
    await transaction.auditLog.create({
      data: { ...auditData(input.audit), entityId: created.id }
    });
    return created;
  });
  const token = await signAdminSessionToken(
    { userId: input.userId, sessionId: session.id, jwtId },
    expiresAt
  );

  return { session, token };
};

export const validateAdminSessionToken = async (
  token: string,
  dependencies: {
    verifyToken?: typeof verifyAdminSessionToken;
    findSession?: (id: string) => Promise<AdminSessionRecord | null>;
  } = {}
) => {
  const verifyToken = dependencies.verifyToken ?? verifyAdminSessionToken;
  const findSession =
    dependencies.findSession ??
    ((id) =>
      prisma.adminSession.findUnique({
        where: { id },
        include: { user: true }
      }));
  const payload = await verifyToken(token).catch(() => null);

  if (!payload) {
    return null;
  }

  const session = await findSession(payload.sessionId);
  if (!session || !isEligibleAdminSession(session, payload)) {
    return null;
  }

  return { session, token };
};

const auditData = auditLogCreateData;

export const refreshAdminSessionWithAudit = async (input: {
  sessionId: string;
  audit: AuditCreateInput;
}) => {
  const session = await prisma.$transaction(async (transaction) => {
    const current = await transaction.adminSession.findUnique({
      where: { id: input.sessionId },
      include: { user: true }
    });
    if (
      !current ||
      !isEligibleAdminSession(
        current,
        {
          sessionId: current.id,
          userId: current.userId,
          jwtId: current.jwtId
        }
      )
    ) {
      throw new InvalidAdminSessionError("Admin session is no longer valid");
    }

    const refreshed = await transaction.adminSession.update({
      where: { id: input.sessionId },
      data: { lastActivityAt: new Date(), expiresAt: getSessionExpiry() },
      include: { user: true }
    });
    await transaction.auditLog.create({ data: auditData(input.audit) });
    return refreshed;
  });
  const token = await signAdminSessionToken(
    { userId: session.userId, sessionId: session.id, jwtId: session.jwtId },
    session.expiresAt
  );

  return { session, token };
};

export const slideAdminSession = async (input: {
  sessionId: string;
  jwtId: string;
  userId: string;
}) => {
  const session = await prisma.$transaction(async (transaction) => {
    const current = await transaction.adminSession.findUnique({
      where: { id: input.sessionId },
      include: { user: true }
    });
    if (
      !isEligibleAdminSession(
        current,
        {
          sessionId: input.sessionId,
          userId: input.userId,
          jwtId: input.jwtId
        }
      )
    ) {
      throw new InvalidAdminSessionError("Admin session is no longer valid");
    }

    return transaction.adminSession.update({
      where: { id: input.sessionId },
      data: { lastActivityAt: new Date(), expiresAt: getSessionExpiry() },
      include: { user: true }
    });
  });
  const token = await signAdminSessionToken(
    { userId: session.userId, sessionId: session.id, jwtId: session.jwtId },
    session.expiresAt
  );

  return { session, token };
};

export const revokeAdminSessionWithAudit = (input: {
  sessionId: string;
  audit: AuditCreateInput;
}) => {
  return prisma.$transaction(async (transaction) => {
    await transaction.adminSession.update({
      where: { id: input.sessionId },
      data: { revokedAt: new Date() }
    });
    await transaction.auditLog.create({ data: auditData(input.audit) });
  });
};

type SessionCookieEnvironment = Pick<
  typeof env,
  "NODE_ENV" | "SESSION_IDLE_TIMEOUT_MINUTES"
>;

export const getSessionCookieOptions = (
  environment: SessionCookieEnvironment = env
) => ({
  httpOnly: true,
  secure: environment.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: environment.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000
});

export const getClearSessionCookieOptions = (
  environment: Pick<typeof env, "NODE_ENV"> = env
) => ({
  httpOnly: true,
  secure: environment.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
});
