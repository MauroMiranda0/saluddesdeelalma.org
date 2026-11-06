"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { createRequestHandler, isBackendPath } = require("../../../server.cjs");

test("shared routing uses path boundaries and keeps queries", () => {
  for (const url of ["/health", "/health/", "/api/v1", "/api/v1/health?x=1"]) {
    assert.equal(isBackendPath(url), true);
  }
  for (const url of ["/", "/admin/login", "/api/v10", "/healthcheck"]) {
    assert.equal(isBackendPath(url), false);
  }
});

test("shared routing serves backend and frontend and handles frontend failures", async () => {
  let errors = 0;
  const server = http.createServer(
    createRequestHandler(
      (request, response) => response.end(`backend:${request.url}`),
      (request, response) => {
        if (request.url === "/failure") throw new Error("private details");
        response.end("frontend");
      },
      () => {
        errors += 1;
      }
    )
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  try {
    assert.equal(
      await (await fetch(`${base}/api/v1/health?x=1`)).text(),
      "backend:/api/v1/health?x=1"
    );
    assert.equal(await (await fetch(`${base}/admin/login`)).text(), "frontend");
    const failure = await fetch(`${base}/failure`);
    assert.equal(failure.status, 500);
    assert.equal(await failure.text(), "Internal Server Error");
    assert.equal(errors, 1);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
});

test("shared server refuses unsafe configuration before loading the application", () => {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "../../../server.cjs")],
    {
      encoding: "utf8",
      env: {
        NODE_ENV: "production",
        WHATSAPP_OUTBOUND_ENABLED: "true",
        NEXT_PUBLIC_API_BASE_URL: "/api/v1",
        JWT_SECRET: "synthetic-private-value-do-not-print"
      }
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /WHATSAPP_OUTBOUND_ENABLED/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /synthetic-private-value-do-not-print/
  );
});

test("shared build rejects missing or incorrect API URL", () => {
  const script = path.join(__dirname, "../../scripts/check-shared-build.mjs");
  for (const [value, expected] of [
    [undefined, 1],
    ["https://api.example.invalid/api/v1", 1],
    ["/api/v1", 0]
  ]) {
    const result = spawnSync(process.execPath, [script], {
      encoding: "utf8",
      env: value === undefined ? {} : { NEXT_PUBLIC_API_BASE_URL: value }
    });
    assert.equal(result.status, expected);
  }
});
