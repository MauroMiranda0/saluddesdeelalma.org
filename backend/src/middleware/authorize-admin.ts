import type { RequestHandler } from "express";

import { audit } from "../modules/audit/audit.service";
import { AppError } from "./error-handler";

export const authorizeAdmin: RequestHandler = async (
  request,
  _response,
  next
) => {
  try {
    if (!request.adminSession) {
      throw new AppError(401, "unauthorized", "Authentication required");
    }

    if (request.adminSession.user.role !== "admin") {
      await audit({
        actorUserId: request.adminSession.user.id,
        actorChannel: "admin_panel",
        action: "auth_forbidden_role",
        entityType: "admin_session",
        entityId: request.adminSession.id,
        result: "failure",
        ipAddress: request.ip,
        userAgent: request.header("user-agent")
      });

      throw new AppError(403, "forbidden", "Admin role required");
    }

    next();
  } catch (error) {
    next(error);
  }
};
