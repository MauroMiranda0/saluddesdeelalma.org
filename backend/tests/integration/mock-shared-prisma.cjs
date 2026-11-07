"use strict";

const Module = require("node:module");
const path = require("node:path");
const originalLoad = Module._load;
const prismaModule = path.resolve(__dirname, "../../dist/lib/prisma.js");
const prisma = {
  $queryRaw: async () => {
    throw new Error("Synthetic database unavailable");
  },
  $disconnect: async () => {}
};

Module._load = function (request, parent, isMain) {
  if (
    typeof request === "string" &&
    /(?:^|\/)prisma(?:\.js)?$/.test(request) &&
    Module._resolveFilename(request, parent) === prismaModule
  ) {
    return { prisma };
  }
  return originalLoad.call(this, request, parent, isMain);
};
