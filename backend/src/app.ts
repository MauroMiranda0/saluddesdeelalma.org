import crypto from "node:crypto";

import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { adminAppointmentRoutes } from "./modules/appointments/appointments.routes";
import { authRoutes } from "./modules/auth/auth.routes";
import { chatbotRoutes } from "./modules/chatbot/chatbot.routes";
import { directoryRoutes } from "./modules/directory/directory.routes";
import { healthRoutes } from "./modules/health/health.routes";
import { therapistAdminRoutes } from "./modules/therapists/therapists.routes";

export const createApp = () => {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "1mb" }));

  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? crypto.randomUUID();

    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  });

  app.use("/health", healthRoutes);
  app.use(`${env.API_PREFIX}/health`, healthRoutes);
  app.use(`${env.API_PREFIX}/auth`, authRoutes);
  app.use(`${env.API_PREFIX}/webhooks`, chatbotRoutes);
  app.use(`${env.API_PREFIX}/admin`, therapistAdminRoutes);
  app.use(`${env.API_PREFIX}`, adminAppointmentRoutes);
  app.use(`${env.API_PREFIX}`, directoryRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
