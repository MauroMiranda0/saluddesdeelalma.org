import type { RequestHandler } from "express";
import { Router } from "express";

import { env } from "../../config/env";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdmin } from "../../middleware/authorize-admin";
import { asyncHandler, AppError } from "../../middleware/error-handler";
import {
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  refreshAdminSessionWithAudit,
  revokeAdminSessionWithAudit
} from "./session.service";

type AuthRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  refreshAdminSessionWithAudit: typeof refreshAdminSessionWithAudit;
  revokeAdminSessionWithAudit: typeof revokeAdminSessionWithAudit;
};

export const createAuthRoutes = (
  dependencies: Partial<AuthRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest = dependencies.authorizeAdmin ?? authorizeAdmin;
  const refreshSession =
    dependencies.refreshAdminSessionWithAudit ?? refreshAdminSessionWithAudit;
  const revokeSession =
    dependencies.revokeAdminSessionWithAudit ?? revokeAdminSessionWithAudit;

  router.post("/login", (_request, _response, next) => {
    next(
      new AppError(501, "not_implemented", "Login will be implemented with US2")
    );
  });

  router.get(
    "/me",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      if (!request.adminSession) {
        throw new AppError(401, "unauthorized", "Authentication required");
      }

      const refreshed = await refreshSession({
        sessionId: request.adminSession.id,
        audit: {
          actorUserId: request.adminSession.user.id,
          actorChannel: "admin_panel",
          action: "auth_session_accessed",
          entityType: "admin_session",
          entityId: request.adminSession.id,
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });
      response.cookie(
        env.SESSION_COOKIE_NAME,
        refreshed.token,
        getSessionCookieOptions()
      );

      response.json({
        user: refreshed.session.user,
        expiresAt: refreshed.session.expiresAt.toISOString()
      });
    })
  );

  router.post(
    "/logout",
    authenticateRequest,
    authorizeRequest,
    asyncHandler(async (request, response) => {
      if (!request.adminSession) {
        throw new AppError(401, "unauthorized", "Authentication required");
      }

      await revokeSession({
        sessionId: request.adminSession.id,
        audit: {
          actorUserId: request.adminSession.user.id,
          actorChannel: "admin_panel",
          action: "auth_logout",
          entityType: "admin_session",
          entityId: request.adminSession.id,
          result: "success",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        }
      });
      response.clearCookie(
        env.SESSION_COOKIE_NAME,
        getClearSessionCookieOptions()
      );
      response.status(204).send();
    })
  );

  return router;
};

export const authRoutes = createAuthRoutes();
