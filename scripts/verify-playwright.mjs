#!/usr/bin/env node
/**
 * Verify local Playwright setup for this repo.
 * Run: npm run verify:playwright
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const bin = join(ROOT, "node_modules", ".bin", "playwright");

function run(args) {
  return spawnSync(bin, args, {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: "" },
  });
}

function ok(msg) {
  console.log(`[PASS] ${msg}`);
}
function warn(msg) {
  console.log(`[WARN] ${msg}`);
}
function fail(msg) {
  console.log(`[FAIL] ${msg}`);
}

function readOs() {
  try {
    const text = readFileSync("/etc/os-release", "utf8");
    const get = (k) => text.match(new RegExp(`^${k}="?([^"\\n]+)"?`, "m"))?.[1] ?? "";
    return { id: get("ID"), versionId: get("VERSION_ID"), pretty: get("PRETTY_NAME") };
  } catch {
    return { id: "", versionId: "", pretty: "" };
  }
}

console.log("Playwright setup check (this repo)\n");

if (!existsSync(bin)) {
  fail("@playwright/test not installed — run: npm install");
  process.exit(1);
}
ok("node_modules/.bin/playwright exists");

const ver = run(["--version"]);
if (ver.status === 0) {
  ok(`CLI version: ${(ver.stdout || "").trim()}`);
} else {
  fail("playwright --version failed");
}

if (process.env.PLAYWRIGHT_BROWSERS_PATH) {
  warn(
    `PLAYWRIGHT_BROWSERS_PATH is set (${process.env.PLAYWRIGHT_BROWSERS_PATH}) — may point at wrong browsers. Run: unset PLAYWRIGHT_BROWSERS_PATH`,
  );
} else {
  ok("PLAYWRIGHT_BROWSERS_PATH not set (uses ~/.cache/ms-playwright)");
}

const dry = run(["install", "chromium", "--dry-run"]);
const dryOut = (dry.stdout || "") + (dry.stderr || "");
if (/already installed|is already installed/i.test(dryOut)) {
  ok("Chromium browser present for this project version");
} else if (dry.status === 0) {
  warn("Chromium may need install — run: npm run playwright:setup");
} else {
  warn(`Chromium check: ${dryOut.trim().split("\n")[0] || "run npm run playwright:setup"}`);
}

const os = readOs();
if (process.platform === "linux") {
  ok(`Linux: ${os.pretty || os.id || "unknown"}`);
  if (os.id === "debian" && os.versionId === "13") {
    warn("Debian trixie: system deps via sudo npm run playwright:install-deps (debian12 apt list)");
  }
} else if (process.platform === "darwin") {
  ok("macOS: npm run playwright:setup (browsers only)");
} else if (process.platform === "win32") {
  warn("Windows: use WSL for E2E — see docs/playwright-wsl-setup.md");
}

if (process.platform === "linux" && !process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
  warn("No DISPLAY/WAYLAND — UI mode needs WSLg or an X server; headless still works");
}

console.log(`
Setup (portable):
  npm run playwright:setup              # browsers + prints sudo step if needed
  sudo npm run playwright:install-deps  # Linux system libs (OS-detected; needs password)

UI mode (dev Supabase, no create/delete):
  npm run test:e2e:ui:dev -- --grep @phase6
  # Or: npx playwright test --ui --ui-host 127.0.0.1 --grep @phase6
  # UI does not auto-run tests — click Run in the browser tab.

Headless:
  npm run test:e2e:dev -- --grep @phase6
`);
