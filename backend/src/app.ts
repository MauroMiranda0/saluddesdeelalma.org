import crypto from "node:crypto";

import cors from "cors";
import express from "express";

import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";
import { authRoutes } from "./modules/auth/auth.routes";
import { healthRoutes } from "./modules/health/health.routes";

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

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export const app = createApp();
