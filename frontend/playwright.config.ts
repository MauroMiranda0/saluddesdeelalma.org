import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "movil",
      use: {
        ...devices["iPhone 13"]
      }
    }
  ],
  webServer: [
    {
      command: "npm --prefix .. run dev:backend",
      url: "http://localhost:4000/health",
      reuseExistingServer: true,
      timeout: 60_000
    },
    {
      command: "npm --prefix .. run dev:frontend",
      url: "http://localhost:3000/admin/login",
      reuseExistingServer: true,
      timeout: 60_000
    }
  ]
});
