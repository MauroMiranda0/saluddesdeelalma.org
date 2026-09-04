import type { Request, RequestHandler } from "express";

import { env } from "../config/env";
import { audit } from "../modules/audit/audit.service";
import {
  getSessionCookieOptions,
  validateAdminSessionToken
} from "../modules/auth/session.service";
import { AppError } from "./error-handler";

const parseCookies = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader.split(";").map((cookie) => {
      const [name, ...valueParts] = cookie.trim().split("=");
      return [name, decodeURIComponent(valueParts.join("="))];
    })
  );
};

const auditDeniedAccess = async (request: Request, action: string) => {
  await audit({
    actorChannel: "admin_panel",
    action,
    entityType: "admin_session",
    result: "failure",
    ipAddress: request.ip,
    userAgent: request.header("user-agent")
  });
};

export const authenticate: RequestHandler = async (request, response, next) => {
  try {
    const cookies = parseCookies(request.header("cookie"));
    const token = cookies.get(env.SESSION_COOKIE_NAME);

    if (!token) {
      await auditDeniedAccess(request, "auth_missing_session");
      throw new AppError(401, "unauthorized", "Authentication required");
    }

    const validation = await validateAdminSessionToken(token);

    if (!validation) {
      await auditDeniedAccess(request, "auth_invalid_session");
      throw new AppError(401, "unauthorized", "Session expired or invalid");
    }

    const { session } = validation;

    request.adminSession = {
      id: session.id,
      jwtId: session.jwtId,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role
      }
    };

    response.cookie(
      env.SESSION_COOKIE_NAME,
      validation.token,
      getSessionCookieOptions()
    );

    next();
  } catch (error) {
    next(error);
  }
};
