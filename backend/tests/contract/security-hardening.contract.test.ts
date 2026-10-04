import assert from "node:assert/strict";
import test from "node:test";

import express from "express";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import {
  ADMIN_RATE_LIMIT,
  RATE_LIMIT_ERROR_CODE,
  WEBHOOK_RATE_LIMIT,
  createRateLimiter,
  createSecurityMiddleware
} from "../../src/middleware/security.js";

const withApp = async (run: (baseUrl: string) => Promise<void>) => {
  const server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

const webhookVerificationUrl = (baseUrl: string, token: string) =>
  `${baseUrl}/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${encodeURIComponent(token)}&hub.challenge=challenge-123`;

test("la API responde con los headers de seguridad en cualquier ruta", async () => {
  await withApp(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-frame-options"), "DENY");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(
      response.headers.get("referrer-policy"),
      "strict-origin-when-cross-origin"
    );
    assert.match(
      response.headers.get("strict-transport-security") ?? "",
      /max-age=15552000/
    );
    assert.equal(response.headers.get("x-powered-by"), null);
    // T216: la CSP se difiere hasta que exista un despliegue que la valide.
    assert.equal(response.headers.get("content-security-policy"), null);
  });
});

test("el webhook y las rutas administrativas declaran su presupuesto de peticiones", async () => {
  await withApp(async (baseUrl) => {
    const webhook = await fetch(
      webhookVerificationUrl(baseUrl, env.WHATSAPP_VERIFY_TOKEN)
    );

    assert.equal(webhook.status, 200);
    assert.match(
      webhook.headers.get("ratelimit") ?? "",
      new RegExp(`limit=${WEBHOOK_RATE_LIMIT.limit}`)
    );

    // Una ruta inexistente basta para observar el limitador: corre antes del
    // router y por lo tanto antes de `authenticate` y de la auditoria.
    const admin = await fetch(`${baseUrl}/api/v1/admin/ruta-inexistente`);

    assert.equal(admin.status, 404);
    assert.match(
      admin.headers.get("ratelimit") ?? "",
      new RegExp(`limit=${ADMIN_RATE_LIMIT.limit}`)
    );
  });
});

test("el rate limiting no es global: el health check nunca se limita", async () => {
  await withApp(async (baseUrl) => {
    const first = await fetch(`${baseUrl}/health`);

    assert.equal(first.status, 200);
    assert.equal(first.headers.get("ratelimit"), null);

    for (
      let attempt = 0;
      attempt < WEBHOOK_RATE_LIMIT.limit + 5;
      attempt += 1
    ) {
      const response = await fetch(`${baseUrl}/health`);

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("ratelimit"), null);
    }
  });
});

const withLimitedServer = async (
  run: (baseUrl: string) => Promise<void>,
  limit: number
) => {
  const app = express();
  const security = createSecurityMiddleware({
    webhookRateLimit: createRateLimiter({
      windowMs: 60_000,
      limit,
      message:
        "Demasiadas notificaciones de WhatsApp. Intenta de nuevo en un minuto."
    })
  });

  // Mismo orden que `backend/src/app.ts`: el requestId se fija antes de los
  // limitadores para que el 429 lo reporte igual que el resto de la API.
  app.use((request, response, next) => {
    const requestId = request.header("x-request-id") ?? "request-1";

    response.locals.requestId = requestId;
    response.setHeader("x-request-id", requestId);
    next();
  });
  app.use(security.webhookRateLimit);
  app.get("/webhook", (_request, response) => {
    response.json({ received: true });
  });

  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Test server did not expose a TCP address");
  }

  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
};

test("exceder el presupuesto responde 429 con la forma de error del proyecto", async () => {
  await withLimitedServer(async (baseUrl) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const allowed = await fetch(`${baseUrl}/webhook`);

      assert.equal(allowed.status, 200);
    }

    const limited = await fetch(`${baseUrl}/webhook`, {
      headers: { "x-request-id": "request-limitado" }
    });

    assert.equal(limited.status, 429);
    const body = (await limited.json()) as {
      code: string;
      message: string;
      requestId: string;
    };
    assert.equal(body.code, RATE_LIMIT_ERROR_CODE);
    assert.equal(body.message, WEBHOOK_RATE_LIMIT.message);
    assert.equal(body.requestId, "request-limitado");
    assert.equal(limited.headers.get("x-request-id"), "request-limitado");
    assert.match(
      limited.headers.get("ratelimit") ?? "",
      /limit=2, remaining=0/
    );
  }, 2);
});

test("un X-Forwarded-For falsificado no reinicia el presupuesto", async () => {
  await withLimitedServer(async (baseUrl) => {
    const allowed = await fetch(`${baseUrl}/webhook`);

    assert.equal(allowed.status, 200);

    const spoofed = await fetch(`${baseUrl}/webhook`, {
      headers: { "x-forwarded-for": "203.0.113.7" }
    });

    // Sin `trust proxy` declarado, Express ignora el encabezado y el
    // contador sigue siendo el de la conexion real.
    assert.equal(spoofed.status, 429);
  }, 1);
});
