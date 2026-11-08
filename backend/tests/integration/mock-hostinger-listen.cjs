"use strict";

const http = require("node:http");
const originalListen = http.Server.prototype.listen;

http.Server.prototype.listen = function (port, ...args) {
  if (port !== 3000) {
    throw new Error("Expected the shared pilot to use the Hostinger default port");
  }
  return originalListen.call(this, Number(process.env.TEST_LISTEN_PORT), ...args);
};
