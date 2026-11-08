"use strict";

const Module = require("node:module");
const originalLoad = Module._load;

Module._load = function (request, parent, isMain) {
  const loaded = originalLoad.call(this, request, parent, isMain);
  if (request !== "next") return loaded;
  return (...args) => {
    const app = loaded(...args);
    const prepare = app.prepare.bind(app);
    app.prepare = async () => {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      await prepare();
    };
    return app;
  };
};
