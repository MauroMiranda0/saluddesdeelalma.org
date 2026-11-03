const path = require("node:path");

const frontendDirectory = __dirname;
const logDirectory = path.resolve(frontendDirectory, "../logs");
const frontendEnv = {
  NODE_ENV: "production",
  PORT: 3000,
  ...(process.env.NEXT_PUBLIC_API_BASE_URL
    ? { NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL }
    : {})
};

module.exports = {
  apps: [
    {
      name: "web",
      cwd: frontendDirectory,
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: frontendEnv,
      out_file: path.join(logDirectory, "web.out.log"),
      error_file: path.join(logDirectory, "web.err.log"),
      max_memory_restart: "256M"
    }
  ]
};
