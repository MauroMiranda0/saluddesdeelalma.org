import crypto from "node:crypto";

import express, { type Request } from "express";

import { env } from "./config/env";
import { createCsrfProtection } from "./middleware/csrf";
import { createCorsMiddleware } from "./middleware/cors";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import {
  createRateLimiter,
  createSecurityMiddleware
} from "./middleware/security";
import { adminAppointmentRoutes } from "./modules/appointments/appointments.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { chatbotRoutes } from "./modules/chatbot/chatbot.routes";
import { directoryRoutes } from "./modules/directory/directory.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { paymentRoutes } from "./modules/payments/payments.routes";
import { reminderRoutes } from "./modules/reminders/reminders.routes";
import { therapistAdminRoutes } from "./modules/therapists/therapists.routes";

const loginRateLimiter = createRateLimiter({
  windowMs: 60_000,
  limit: 10,
  message:
    "Demasiados intentos de inicio de sesión. Intenta de nuevo en un minuto."
});
const adminAccessRecoveryRateLimiter = createRateLimiter({
  windowMs: 15 * 60_000,
  limit: 5,
  message: "Demasiados intentos de recuperación. Intenta de nuevo más tarde."
});

export const createApp = () => {
  const app = express();
  const security = createSecurityMiddleware();

  app.disable("x-powered-by");
  // FR-026: the audit trail records the caller's IP, so behind Hostinger or
  // Cloudflare `request.ip` is the proxy unless the hop is declared here.
  // Unset preserves the previous behaviour of trusting no proxy.
  if (env.TRUST_PROXY !== undefined) {
    app.set("trust proxy", env.TRUST_PROXY);
  }
  app.use(createCorsMiddleware(env.FRONTEND_ORIGIN));
  app.use(security.headers);
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? crypto.randomUUID();

    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  });
  app.use(createCsrfProtection(env.FRONTEND_ORIGIN, env.SESSION_COOKIE_NAME));
  app.use(
    express.json({
      limit: "1mb",
      verify: (request, _response, body) => {
        (request as Request & { rawBody?: Buffer }).rawBody = Buffer.from(body);
      }
    })
  );

  app.use("/health", healthRoutes);
  app.use(`${env.API_PREFIX}/health`, healthRoutes);
  app.use(`${env.API_PREFIX}/auth/login`, loginRateLimiter);
  app.use(
    `${env.API_PREFIX}/auth/admin-access/reactivate`,
    adminAccessRecoveryRateLimiter
  );
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(
    `${env.API_PREFIX}/webhooks`,
    security.webhookRateLimit,
    chatbotRoutes
  );
  app.use(
    `${env.API_PREFIX}/admin`,
    security.adminRateLimit,
    therapistAdminRoutes
  );
  app.use(`${env.API_PREFIX}`, adminAppointmentRoutes);
  app.use(`${env.API_PREFIX}`, paymentRoutes);
  app.use(`${env.API_PREFIX}`, reminderRoutes);
  app.use(`${env.API_PREFIX}`, directoryRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
