import { env } from "../../config/env";
import { prisma } from "../../lib/prisma";
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
    session.jwtId !== payload.jwtId ||
    session.revokedAt ||
    !session.user.isActive
  ) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const expiresAt = getSessionExpiry();

  const refreshedSession = await prisma.adminSession.update({
    where: { id: session.id },
    data: {
      lastActivityAt: new Date(),
      expiresAt
    },
    include: { user: true }
  });
  const refreshedToken = await signAdminSessionToken(
    {
      userId: refreshedSession.userId,
      sessionId: refreshedSession.id,
      jwtId: refreshedSession.jwtId
    },
    refreshedSession.expiresAt
  );

  return { session: refreshedSession, token: refreshedToken };
};

export const revokeAdminSession = async (sessionId: string) => {
  await prisma.adminSession.update({
    where: { id: sessionId },
    data: { revokedAt: new Date() }
  });
};

export const getSessionCookieOptions = () => ({
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: env.SESSION_IDLE_TIMEOUT_MINUTES * 60 * 1000
});
