#!/usr/bin/env node
/**
 * Verify local Playwright setup for this repo.
 * Run: npm run verify:playwright
 */

import { existsSync } from "node:fs";
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
  warn("Chromium may need install — run: npm run playwright:install");
} else {
  warn(`Chromium check: ${dryOut.trim().split("\n")[0] || "run npm run playwright:install"}`);
}

console.log(`
Commands (run from repo root):
  npm run playwright:install          # browsers (no sudo)
  sudo npx playwright install-deps chromium   # system libs (needs sudo, NOT "install-deps" alone)
  npm run playwright:install-deps     # same as above (prompts for sudo)

Do NOT run bare "install-deps" or "playwright" — use npx or npm run scripts.

Quick test:
  npm run test:e2e:dev -- --grep @phase6
  npm run test:e2e:ui -- --dev --grep @phase6
`);
