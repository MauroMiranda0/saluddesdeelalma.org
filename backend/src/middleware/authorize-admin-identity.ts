import type { RequestHandler } from "express";

import { audit as auditService } from "../modules/audit/audit.service";
import { AppError } from "./error-handler";

export const createAuthorizeAdminIdentity = (
  audit: typeof auditService = auditService
): RequestHandler => {
  return async (request, response, next) => {
    try {
      const session = request.adminSession;

      if (!session) {
        throw new AppError(401, "unauthorized", "Authentication required");
      }

      if (session.user.role !== "admin" || session.user.username !== "admin") {
        await audit({
          actorUserId: session.user.id,
          actorChannel: "admin_panel",
          action: "auth_forbidden_identity",
          entityType: "admin_session",
          entityId: session.id,
          result: "failure",
          metadata: { requestId: response.locals.requestId },
          ipAddress: request.ip,
          userAgent: request.header("user-agent")
        });
        throw new AppError(
          403,
          "forbidden",
          "Admin identity required to access the panel"
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const authorizeAdminIdentity = createAuthorizeAdminIdentity();
