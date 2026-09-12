import type { Request, RequestHandler, Response } from "express";

import { env } from "../config/env";
import { audit } from "../modules/audit/audit.service";
import {
  getSessionCookieOptions,
  slideAdminSession,
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

const auditDeniedAccess = async (
  request: Request,
  response: Response,
  action: string
) => {
  await audit({
    actorChannel: "admin_panel",
    action,
    entityType: "admin_session",
    result: "failure",
    metadata: { requestId: response.locals.requestId },
    ipAddress: request.ip,
    userAgent: request.header("user-agent")
  });
};

export const authenticate: RequestHandler = async (request, response, next) => {
  try {
    let cookies: Map<string, string>;

    try {
      cookies = parseCookies(request.header("cookie"));
    } catch {
      await auditDeniedAccess(request, response, "auth_malformed_cookie");
      throw new AppError(401, "unauthorized", "Session cookie is malformed");
    }

    const token = cookies.get(env.SESSION_COOKIE_NAME);

    if (!token) {
      await auditDeniedAccess(request, response, "auth_missing_session");
      throw new AppError(401, "unauthorized", "Authentication required");
    }

    const validation = await validateAdminSessionToken(token);

    if (!validation) {
      await auditDeniedAccess(request, response, "auth_invalid_session");
      throw new AppError(401, "unauthorized", "Session expired or invalid");
    }

    const { session, token: renewedToken } = await slideAdminSession({
      sessionId: validation.session.id,
      jwtId: validation.session.jwtId,
      userId: validation.session.user.id
    });

    request.adminSession = {
      id: session.id,
      jwtId: session.jwtId,
      expiresAt: session.expiresAt,
      user: {
        id: session.user.id,
        username: session.user.username ?? "",
        email: session.user.email,
        fullName: session.user.fullName,
        role: session.user.role
      }
    };

    response.cookie(
      env.SESSION_COOKIE_NAME,
      renewedToken,
      getSessionCookieOptions()
    );

    next();
  } catch (error) {
    next(error);
  }
};
