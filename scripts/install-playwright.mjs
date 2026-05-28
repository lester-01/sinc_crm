#!/usr/bin/env node
/**
 * One-shot Playwright setup: download Chromium + install Linux system libs (OS-aware).
 *
 * Browsers: no sudo.
 * System deps (Linux): needs sudo — script will try `sudo -n` or print the exact command.
 *
 * Usage: npm run playwright:setup
 */

import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const playwrightBin = join(ROOT, "node_modules", ".bin", "playwright");
const depsScript = join(ROOT, "scripts", "install-playwright-deps.sh");

function log(msg) {
  console.log(msg);
}

function childEnv() {
  const env = { ...process.env };
  delete env.PLAYWRIGHT_BROWSERS_PATH;
  return env;
}

function run(bin, args, opts = {}) {
  return spawnSync(bin, args, {
    cwd: ROOT,
    env: childEnv(),
    encoding: "utf8",
    stdio: opts.inherit ? "inherit" : "pipe",
    ...opts,
  });
}

function readOsRelease() {
  try {
    const text = readFileSync("/etc/os-release", "utf8");
    const get = (key) => text.match(new RegExp(`^${key}="?([^"\\n]+)"?`, "m"))?.[1] ?? "";
    return {
      id: get("ID"),
      versionId: get("VERSION_ID"),
      codename: get("VERSION_CODENAME"),
      pretty: get("PRETTY_NAME") || get("NAME"),
    };
  } catch {
    return { id: "", versionId: "", codename: "", pretty: "" };
  }
}

function isWsl() {
  try {
    return readFileSync("/proc/version", "utf8").toLowerCase().includes("microsoft");
  } catch {
    return false;
  }
}

function main() {
  log("Playwright setup (project-local @playwright/test)\n");

  if (!existsSync(playwrightBin)) {
    console.error("Run npm install first.");
    process.exit(1);
  }

  const os = readOsRelease();
  const platform = process.platform;

  if (platform === "linux") {
    log(`OS: ${os.pretty || "Linux"}${isWsl() ? " (WSL)" : ""}`);
    if (os.id === "debian" && os.versionId === "13") {
      log("Note: Debian trixie is a known edge case — deps use debian12 apt list (tested on trixie).");
    }
  } else if (platform === "darwin") {
    log("OS: macOS — browser download only (no apt step).");
  } else if (platform === "win32") {
    log("OS: Windows — use WSL for E2E; see docs/playwright-wsl-setup.md");
  } else {
    log(`OS: ${platform}`);
  }

  log("\n[1/2] Installing Chromium browser (no sudo)...");
  const install = run(playwrightBin, ["install", "chromium"], { stdio: "inherit" });
  if (install.status !== 0) {
    process.exit(install.status ?? 1);
  }

  if (platform !== "linux") {
    log("\n[2/2] Skipped system packages (not Linux).");
    log("Done. Run: npm run verify:playwright");
    return;
  }

  log("\n[2/2] Installing Chromium system libraries (Linux, needs sudo)...");

  if (process.getuid?.() === 0) {
    const deps = run("bash", [depsScript], { stdio: "inherit" });
    process.exit(deps.status === 0 ? 0 : deps.status ?? 1);
  }

  const sudoCheck = spawnSync("sudo", ["-n", "true"], { encoding: "utf8" });
  if (sudoCheck.status === 0) {
    log("Using passwordless sudo...");
    const deps = run("sudo", ["bash", depsScript], { stdio: "inherit" });
    process.exit(deps.status === 0 ? 0 : deps.status ?? 1);
  }

  log("");
  log("Could not run apt install without your password.");
  log("Run this in your terminal (outside Cursor sandbox if needed):");
  log("");
  log("  sudo npm run playwright:install-deps");
  log("");
  log("Or full setup after browsers:");
  log("  npm run playwright:install");
  log("  sudo npm run playwright:install-deps");
  log("");
  log("Then: npm run verify:playwright");
}

main();
