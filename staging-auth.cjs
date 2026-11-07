"use strict";

const { createHash, createHmac, timingSafeEqual } = require("node:crypto");

const cookieName = "__Host-sda-staging";

const digest = (value) => createHash("sha256").update(value).digest();
const equal = (left, right) => timingSafeEqual(digest(left), digest(right));

const preventCaching = (response) => {
  const cacheControl = "private, no-store, max-age=0";
  const setHeader = response.setHeader;
  response.setHeader = function (name, value) {
    return setHeader.call(
      this,
      name,
      name.toLowerCase() === "cache-control" ? cacheControl : value
    );
  };
  const writeHead = response.writeHead;
  response.writeHead = function (status, ...args) {
    const headerIndex = typeof args[0] === "string" ? 1 : 0;
    const headers = args[headerIndex];
    if (Array.isArray(headers)) {
      args[headerIndex] = headers.filter((_, index) =>
        index % 2 === 0
          ? String(headers[index]).toLowerCase() !== "cache-control"
          : String(headers[index - 1]).toLowerCase() !== "cache-control"
      );
    } else if (headers && typeof headers === "object") {
      args[headerIndex] = Object.fromEntries(
        Object.entries(headers).filter(
          ([name]) => name.toLowerCase() !== "cache-control"
        )
      );
    }
    setHeader.call(this, "Cache-Control", cacheControl);
    return writeHead.call(this, status, ...args);
  };
  response.setHeader("Cache-Control", cacheControl);
};

const createStagingProtection = (username, password) => {
  if (
    typeof username !== "string" ||
    !/^[A-Za-z0-9._-]{1,128}$/.test(username)
  ) {
    throw new Error("STAGING_AUTH_USER must be a non-empty ASCII username");
  }
  if (typeof password !== "string" || !/^[\x21-\x7e]{32,256}$/.test(password)) {
    throw new Error(
      "STAGING_AUTH_PASSWORD must be 32-256 printable ASCII characters without spaces"
    );
  }

  const credentials = `${username}:${password}`;
  const session = createHmac("sha256", password)
    .update(`saluddesdeelalma-staging:${username}`)
    .digest("hex");

  return (request, response, next) => {
    preventCaching(response);
    const cookie = (request.headers.cookie || "")
      .split(";")
      .map((item) => item.trim())
      .find((item) => item.startsWith(`${cookieName}=`));
    const authenticatedCookie =
      cookie && equal(cookie.slice(cookieName.length + 1), session);
    if (authenticatedCookie) {
      next();
      return;
    }

    const authorization = request.headers.authorization || "";
    const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(authorization);
    if (match) {
      const decoded = Buffer.from(match[1], "base64");
      if (
        decoded.toString("base64") === match[1] &&
        equal(decoded, credentials)
      ) {
        response.setHeader(
          "Set-Cookie",
          `${cookieName}=${session}; Path=/; Secure; HttpOnly; SameSite=Strict`
        );
        next();
        return;
      }
    }

    response.writeHead(401, {
      "WWW-Authenticate": 'Basic realm="Staging", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8"
    });
    response.end("Autenticación requerida");
  };
};

module.exports = { createStagingProtection };
