import { defineConfig, devices } from "@playwright/test";
import { existsSync, readFileSync } from "node:fs";

// Use default ~/.cache/ms-playwright — ignore Cursor sandbox PLAYWRIGHT_BROWSERS_PATH
delete process.env.PLAYWRIGHT_BROWSERS_PATH;

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:5173";
const sessionDir = process.env.E2E_SESSION_DIR;
const uiMode = process.env.E2E_UI_MODE === "1";
const deployPagesUrl = (process.env.DEPLOY_PAGES_URL || "").replace(/\/$/, "");
const isProductionDeployRun =
  deployPagesUrl.length > 0 &&
  !deployPagesUrl.includes("127.0.0.1") &&
  !deployPagesUrl.includes("localhost");

function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const env: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

/** Wrangler dev needs Supabase vars; isolated E2E passes E2E_ENV_FILE. */
function workerWebServerEnv(): NodeJS.ProcessEnv {
  const overlay = process.env.E2E_ENV_FILE ? parseEnvFile(process.env.E2E_ENV_FILE) : {};
  return { ...process.env, ...overlay };
}

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
  webServer: isProductionDeployRun
    ? undefined
    : [
        {
          command: "npm run dev",
          url: baseURL,
          // UI mode: prefer already-running dev servers (faster, avoids WSL startup stalls)
          reuseExistingServer: uiMode ? true : !process.env.E2E_FORCE_SERVERS,
          timeout: uiMode ? 180_000 : 120_000,
        },
        {
          command: "npm run dev",
          cwd: "worker",
          url: "http://127.0.0.1:8787/api/health",
          env: workerWebServerEnv(),
          reuseExistingServer: uiMode ? true : !process.env.E2E_FORCE_SERVERS,
          timeout: uiMode ? 180_000 : 120_000,
        },
      ],
});
