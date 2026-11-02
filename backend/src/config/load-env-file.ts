import { existsSync } from "node:fs";
import { resolve } from "node:path";

const loadProductionEnvFile = () => {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const candidates = process.env.ENV_FILE
    ? [process.env.ENV_FILE]
    : [".env.production", ".env"];

  const envFile = candidates
    .map((candidate) => resolve(process.cwd(), candidate))
    .find((candidate) => existsSync(candidate));

  if (!envFile) {
    console.warn(
      `No se encontró archivo de entorno de producción (${candidates.join(", ")}). Se usará process.env.`
    );
    return;
  }

  process.loadEnvFile(envFile);
};

loadProductionEnvFile();
