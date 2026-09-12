import type { RequestHandler } from "express";
import { Router } from "express";

import { env } from "../../config/env";
import { loginCredentialsSchema } from "../../lib/validators/auth";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdminIdentity } from "../../middleware/authorize-admin-identity";
import { asyncHandler, AppError } from "../../middleware/error-handler";
import { audit as auditService } from "../audit/audit.service";
import { adminUserDto, identifyAdminForLogin } from "./auth.service";
import {
  createAdminSessionWithAudit,
  getClearSessionCookieOptions,
  getSessionCookieOptions,
  refreshAdminSessionWithAudit,
  revokeAdminSessionWithAudit
} from "./session.service";

type AuthRouteDependencies = {
  authenticate: RequestHandler;
  authorizeAdmin: RequestHandler;
  login: typeof identifyAdminForLogin;
  createSession: typeof createAdminSessionWithAudit;
  audit: typeof auditService;
  refreshAdminSessionWithAudit: typeof refreshAdminSessionWithAudit;
  revokeAdminSessionWithAudit: typeof revokeAdminSessionWithAudit;
};

export const createAuthRoutes = (
  dependencies: Partial<AuthRouteDependencies> = {}
) => {
  const router = Router();
  const authenticateRequest = dependencies.authenticate ?? authenticate;
  const authorizeRequest =
    dependencies.authorizeAdmin ?? authorizeAdminIdentity;
  const login = dependencies.login ?? identifyAdminForLogin;
  const createSession =
    dependencies.createSession ?? createAdminSessionWithAudit;
  const audit = dependencies.audit ?? auditService;
  const refreshSession =
    dependencies.refreshAdminSessionWithAudit ?? refreshAdminSessionWithAudit;
  const revokeSession =
    dependencies.revokeAdminSessionWithAudit ?? revokeAdminSessionWithAudit;

  router.post(
    "/login",
    asyncHandler(async (request, response) => {
      const parsed = loginCredentialsSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new AppError(
          400,
          "validation_error",
          "Username and password are required"
        );
      }

      const result = await login(parsed.data.username, parsed.data.password);
      const baseAudit = {
        actorChannel: "admin_panel" as const,
        metadata: {
          requestId: response.locals.requestId,
          username: parsed.data.username
        },
        ipAddress: request.ip,
        userAgent: request.header("user-agent")
      };

      if (result.status === "invalid_credentials") {
        await audit({
          ...baseAudit,
          action: "auth_login_failed",
          entityType: "auth_attempt",
          result: "failure"
        });
        throw new AppError(
          401,
          "unauthorized",
          "Usuario o contraseña incorrectos"
        );
      }

      if (result.status === "forbidden_identity") {
        await audit({
          ...baseAudit,
          actorUserId: result.userId,
          action: "auth_login_forbidden_identity",
          entityType: "auth_attempt",
          result: "failure"
        });
        throw new AppError(
          403,
          "forbidden",
          "Esta identidad no tiene acceso al panel"
        );
      }

      const created = await createSession({
        userId: result.user.id,
        ipAddress: request.ip,
        userAgent: request.header("user-agent"),
        audit: {
          ...baseAudit,
          actorUserId: result.user.id,
          action: "auth_login",
          entityType: "admin_session",
          result: "success"
        }
      });

      response.cookie(
        env.SESSION_COOKIE_NAME,
        created.token,
        getSessionCookieOptions()
      );
      response.json({
        user: adminUserDto({
          ...result.user,
          role: "admin"
        }),
        expiresAt: created.session.expiresAt.toISOString()
      });
    })
  );

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
        user: adminUserDto(refreshed.session.user),
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
