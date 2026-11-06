import { Router } from "express";

import { logger } from "../../lib/logger";
import { prisma } from "../../lib/prisma";

export type HealthRouteDependencies = {
  checkDatabase: () => Promise<unknown>;
};

const defaultDependencies: HealthRouteDependencies = {
  checkDatabase: () => prisma.$queryRaw`SELECT 1`
};

export const createHealthRoutes = (
  dependencies: HealthRouteDependencies = defaultDependencies
) => {
  const livenessRoutes = Router();
  const readinessRoutes = Router();

  livenessRoutes.get("/", (_request, response) => {
    response.json({ status: "ok", service: "saluddesdeelalma-backend" });
  });

  readinessRoutes.get("/", async (_request, response) => {
    const requestId = response.locals.requestId as string | undefined;

    try {
      await dependencies.checkDatabase();
      response.json({
        status: "ok",
        database: true,
        timestamp: new Date().toISOString()
      });
    } catch {
      logger.error(
        { event: "health_database_unavailable", requestId },
        "Readiness check failed"
      );
      response.status(503).json({
        status: "unhealthy",
        database: false,
        timestamp: new Date().toISOString()
      });
    }
  });

  return { livenessRoutes, readinessRoutes };
};
