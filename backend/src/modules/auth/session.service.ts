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

export const validateAdminSessionToken = async (token: string) => {
  const payload = await verifyAdminSessionToken(token).catch(() => null);

  if (!payload) {
    return null;
  }

  const session = await prisma.adminSession.findUnique({
    where: { id: payload.sessionId },
    include: { user: true }
  });

  if (
    !session ||
    session.userId !== payload.userId ||
    session.jwtId !== payload.jwtId ||
    session.revokedAt ||
    !session.user.isActive
  ) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
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
  const session = await prisma.adminSession.update({
    where: { id: input.sessionId },
    data: { lastActivityAt: new Date(), expiresAt: getSessionExpiry() },
    include: { user: true }
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

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000
});

export const getClearSessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/"
});
