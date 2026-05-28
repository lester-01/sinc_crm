import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const sessionDir = process.env.E2E_SESSION_DIR;

export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: sessionDir ? `${sessionDir}/playwright-report` : "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "on",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev",
      url: baseURL,
      reuseExistingServer: !process.env.E2E_FORCE_SERVERS,
      timeout: 120_000,
    },
    {
      command: "npm run dev",
      cwd: "worker",
      url: "http://127.0.0.1:8787/api/health",
      env: {
        ...process.env,
      },
      reuseExistingServer: !process.env.E2E_FORCE_SERVERS,
      timeout: 120_000,
    },
  ],
});
