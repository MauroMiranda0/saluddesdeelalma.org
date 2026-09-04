import crypto from "node:crypto";

import { jwtVerify, SignJWT } from "jose";

import { env } from "../../config/env";

const secret = new TextEncoder().encode(env.JWT_SECRET);

export type AdminTokenPayload = {
  userId: string;
  sessionId: string;
  jwtId: string;
};

export const createJwtId = () => crypto.randomUUID();

export const signAdminSessionToken = async (
  payload: AdminTokenPayload,
  expiresAt: Date
) => {
  return new SignJWT({ sessionId: payload.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.userId)
    .setJti(payload.jwtId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret);
};

export const verifyAdminSessionToken = async (
  token: string
): Promise<AdminTokenPayload> => {
  const { payload } = await jwtVerify(token, secret);

  if (!payload.sub || !payload.jti || typeof payload.sessionId !== "string") {
    throw new Error("Invalid admin session token payload");
  }

  return {
    userId: payload.sub,
    sessionId: payload.sessionId,
    jwtId: payload.jti
  };
};
