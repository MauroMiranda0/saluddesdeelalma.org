import { Router } from "express";

import { env } from "../../config/env";
import { authenticate } from "../../middleware/authenticate";
import { authorizeAdmin } from "../../middleware/authorize-admin";
import { asyncHandler, AppError } from "../../middleware/error-handler";
import {
  getClearSessionCookieOptions,
  revokeAdminSession
} from "./session.service";

export const authRoutes = Router();

authRoutes.post("/login", (_request, _response, next) => {
  next(
    new AppError(501, "not_implemented", "Login will be implemented with US2")
  );
});

authRoutes.get(
  "/me",
  authenticate,
  authorizeAdmin,
  asyncHandler(async (request, response) => {
    if (!request.adminSession) {
      throw new AppError(401, "unauthorized", "Authentication required");
    }

    response.json({
      user: request.adminSession.user,
      expiresAt: request.adminSession.expiresAt.toISOString()
    });
  })
);

authRoutes.post(
  "/logout",
  authenticate,
  authorizeAdmin,
  asyncHandler(async (request, response) => {
    if (!request.adminSession) {
      throw new AppError(401, "unauthorized", "Authentication required");
    }

    await revokeAdminSession(request.adminSession.id);
    response.clearCookie(
      env.SESSION_COOKIE_NAME,
      getClearSessionCookieOptions()
    );
    response.status(204).send();
  })
);
