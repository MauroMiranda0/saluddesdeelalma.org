const path = require("node:path");

const backendDirectory = __dirname;
const logDirectory = path.resolve(backendDirectory, "../logs");
const backendEnvFile = process.env.BACKEND_ENV_FILE;
const backendEnv = {
  NODE_ENV: "production",
  ...(backendEnvFile ? { ENV_FILE: backendEnvFile } : {})
};

module.exports = {
  apps: [
    {
      name: "api",
      cwd: backendDirectory,
      script: "dist/server.js",
      env: backendEnv,
      out_file: path.join(logDirectory, "api.out.log"),
      error_file: path.join(logDirectory, "api.err.log"),
      max_memory_restart: "256M"
    },
    {
      name: "reminders",
      cwd: backendDirectory,
      script: "dist/jobs/reminders-worker.entry.js",
      env: backendEnv,
      out_file: path.join(logDirectory, "reminders.out.log"),
      error_file: path.join(logDirectory, "reminders.err.log"),
      max_memory_restart: "128M"
    },
    {
      name: "whatsapp-inbox",
      cwd: backendDirectory,
      script: "dist/jobs/whatsapp-inbox-worker.entry.js",
      env: backendEnv,
      out_file: path.join(logDirectory, "whatsapp-inbox.out.log"),
      error_file: path.join(logDirectory, "whatsapp-inbox.err.log"),
      max_memory_restart: "128M"
    }
  ]
};
