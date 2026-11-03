import type { RequestHandler } from "express";

import { AppError } from "./error-handler";

const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const hasCookie = (cookieHeader: string | undefined, cookieName: string) =>
  cookieHeader
    ?.split(";")
    .some((cookie) => cookie.trim().split("=", 1)[0] === cookieName) ?? false;

export const createCsrfProtection = (
  allowedOrigins: string[],
  sessionCookieName: string
): RequestHandler => {
  const allowed = new Set(allowedOrigins);

  return (request, _response, next) => {
    if (safeMethods.has(request.method.toUpperCase())) {
      next();
      return;
    }

    const isLoginRequest = request.path.endsWith("/auth/login");
    if (
      !isLoginRequest &&
      !hasCookie(request.header("cookie"), sessionCookieName)
    ) {
      next();
      return;
    }

    const origin = request.header("origin");
    if (!origin || !allowed.has(origin)) {
      next(
        new AppError(
          403,
          "csrf_origin_denied",
          "Request origin is not allowed"
        )
      );
      return;
    }

    next();
  };
};
