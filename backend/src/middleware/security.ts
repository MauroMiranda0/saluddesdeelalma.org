import type { RequestHandler } from "express";

import rateLimit from "express-rate-limit";
import helmet from "helmet";

import { logger } from "../lib/logger";

export type RateLimitPolicy = {
  windowMs: number;
  limit: number;
  message: string;
};

export const RATE_LIMIT_ERROR_CODE = "rate_limit_exceeded";

// T066: the budget only exists to stop a runaway client, so it is generous
// enough for a real clinic: Meta delivers the conversation in bursts and the
// panel refetches the agenda. It is never applied globally, because the
// reminder and WhatsApp inbox workers share the same deployment.
export const ADMIN_RATE_LIMIT: RateLimitPolicy = {
  windowMs: 60_000,
  limit: 300,
  message: "Demasiadas solicitudes al panel. Intenta de nuevo en un minuto."
};

export const WEBHOOK_RATE_LIMIT: RateLimitPolicy = {
  windowMs: 60_000,
  limit: 120,
  message:
    "Demasiadas notificaciones de WhatsApp. Intenta de nuevo en un minuto."
};

export const createRateLimiter = (policy: RateLimitPolicy): RequestHandler =>
  rateLimit({
    windowMs: policy.windowMs,
    limit: policy.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Un rechazo es un evento de seguridad, no una accion de negocio: queda en
    // `pino` y no en `audit_logs`, porque escribir en PostgreSQL mientras se
    // descarta una inundacion la amplifica. `request.ip` es la unica clave que
    // respeta el limite, asi que se registra tal cual la resuelve Express.
    handler: (request, response) => {
      const requestId = response.locals.requestId as string | undefined;

      logger.warn(
        {
          code: RATE_LIMIT_ERROR_CODE,
          requestId,
          method: request.method,
          path: request.originalUrl,
          ipAddress: request.ip,
          limit: policy.limit,
          windowMs: policy.windowMs
        },
        "Rate limit exceeded"
      );
      response.status(429).json({
        code: RATE_LIMIT_ERROR_CODE,
        message: policy.message,
        requestId
      });
    }
  });

// T066: helmet with an explicit allowlist. `contentSecurityPolicy` stays off on
// purpose: a wrong directive set breaks Next.js in production and there is no
// environment to validate it until the deploy exists (T216).
export const createSecurityHeaders = (): RequestHandler =>
  helmet({
    contentSecurityPolicy: false,
    frameguard: { action: "deny" },
    hsts: { maxAge: 15552000, includeSubDomains: false },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xContentTypeOptions: true
  });

export type SecurityMiddleware = {
  headers: RequestHandler;
  adminRateLimit: RequestHandler;
  webhookRateLimit: RequestHandler;
};

export const createSecurityMiddleware = (
  dependencies: Partial<SecurityMiddleware> = {}
): SecurityMiddleware => ({
  headers: dependencies.headers ?? createSecurityHeaders(),
  adminRateLimit:
    dependencies.adminRateLimit ?? createRateLimiter(ADMIN_RATE_LIMIT),
  webhookRateLimit:
    dependencies.webhookRateLimit ?? createRateLimiter(WEBHOOK_RATE_LIMIT)
});
