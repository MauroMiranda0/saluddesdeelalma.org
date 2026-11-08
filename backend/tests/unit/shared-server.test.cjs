"use strict";

const assert = require("node:assert/strict");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const test = require("node:test");
const { createRequestHandler, isBackendPath } = require("../../../server.cjs");
const { createStagingProtection } = require("../../../staging-auth.cjs");
const { buildArguments } = require("../../../frontend/scripts/build.cjs");

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

test("shared server requires explicit shared pilot mode", () => {
  for (const mode of [undefined, "false", "invalid"]) {
    const env = {};
    if (mode !== undefined) env.SHARED_PILOT_BUILD = mode;
    const result = spawnSync(
      process.execPath,
      [path.join(__dirname, "../../../server.cjs")],
      { encoding: "utf8", env }
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /SHARED_PILOT_BUILD/);
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
        SHARED_PILOT_BUILD: "true",
        WHATSAPP_OUTBOUND_ENABLED: "true",
        NEXT_PUBLIC_API_BASE_URL: "/api/v1",
        STAGING_AUTH_USER: "local-user",
        STAGING_AUTH_PASSWORD: "synthetic-password-at-least-32-characters",
        JWT_SECRET: "synthetic-private-value-do-not-print"
      }
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /WHATSAPP_OUTBOUND_ENABLED/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /synthetic-private-value-do-not-print/
  );
});

test("staging protection rejects missing or weak configuration", () => {
  for (const [user, password] of [
    [undefined, "synthetic-password-at-least-32-characters"],
    ["local-user", undefined],
    ["local-user", "short"],
    ["user:name", "synthetic-password-at-least-32-characters"]
  ]) {
    assert.throws(() => createStagingProtection(user, password));
  }
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "../../../server.cjs")],
    {
      encoding: "utf8",
      env: { STAGING_AUTH_USER: "local-user", SHARED_PILOT_BUILD: "true" }
    }
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /STAGING_AUTH_PASSWORD/);
});

test("staging protection covers frontend, health and API and preserves Bearer authorization", async () => {
  const username = "local-user";
  const password = "synthetic-password-at-least-32-characters";
  const protect = createStagingProtection(username, password);
  let handled = 0;
  const server = http.createServer((request, response) => {
    protect(request, response, () => {
      handled += 1;
      response.setHeader("Cache-Control", "public, max-age=3600");
      response.writeHead(200, { "Cache-Control": "public, max-age=3600" });
      response.end(request.headers.authorization || "protected");
    });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const base = `http://127.0.0.1:${address.port}`;
  const basic = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  try {
    for (const route of [
      "/",
      "/admin/login",
      "/_next/static/file.js",
      "/health",
      "/api/v1/health",
      "/api/v1/webhooks/whatsapp"
    ]) {
      const response = await fetch(`${base}${route}`);
      assert.equal(response.status, 401);
      assert.match(response.headers.get("www-authenticate"), /^Basic /);
      assert.match(response.headers.get("cache-control"), /no-store/);
    }
    assert.equal(handled, 0);
    assert.equal(
      (await fetch(base, { headers: { authorization: "Basic invalid" } }))
        .status,
      401
    );
    const accepted = await fetch(base, { headers: { authorization: basic } });
    assert.equal(accepted.status, 200);
    assert.match(accepted.headers.get("cache-control"), /no-store/);
    const setCookie = accepted.headers.get("set-cookie");
    assert.match(setCookie, /__Host-sda-staging=/);
    assert.match(setCookie, /Secure/);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    const cookie = setCookie.split(";", 1)[0];
    const recovery = await fetch(
      `${base}/api/v1/auth/admin-access/reactivate`,
      {
        headers: { authorization: "Bearer synthetic-recovery", cookie }
      }
    );
    assert.equal(recovery.status, 200);
    assert.equal(await recovery.text(), "Bearer synthetic-recovery");
    assert.equal(
      (await fetch(base, { headers: { cookie: "__Host-sda-staging=invalid" } }))
        .status,
      401
    );
    const changed = createStagingProtection(username, `${password}-changed`);
    const fakeResponse = {
      setHeader() {},
      writeHead(status) {
        this.status = status;
      },
      end() {}
    };
    changed({ headers: { cookie } }, fakeResponse, () =>
      assert.fail("old cookie accepted")
    );
    assert.equal(fakeResponse.status, 401);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
  }
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

test("normal build guard checks shared mode without changing regular builds", () => {
  const script = path.join(__dirname, "../../scripts/check-shared-build.mjs");
  for (const [mode, api, expected] of [
    [undefined, undefined, 0],
    ["false", undefined, 0],
    ["invalid", "/api/v1", 1],
    ["true", undefined, 1],
    ["true", "https://example.invalid/api/v1", 1],
    ["true", "/api/v1", 0]
  ]) {
    const env = {};
    if (mode !== undefined) env.SHARED_PILOT_BUILD = mode;
    if (api !== undefined) env.NEXT_PUBLIC_API_BASE_URL = api;
    const result = spawnSync(process.execPath, [script, "--if-shared"], {
      env,
      encoding: "utf8"
    });

    assert.equal(result.status, expected);
  }
});

test("shared pilot selects webpack while regular builds retain their default", () => {
  assert.deepEqual(buildArguments("true"), ["build", "--webpack"]);
  for (const mode of [undefined, "false"]) {
    assert.deepEqual(buildArguments(mode), ["build"]);
  }
});
