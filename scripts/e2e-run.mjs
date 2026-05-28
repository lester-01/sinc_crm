#!/usr/bin/env node
/**
 * Isolated E2E: create Supabase project → schema → seed → Playwright → delete.
 * Usage: node scripts/e2e-run.mjs [--ui] [--] [playwright args…]
 *        node scripts/e2e-run.mjs --dev [--ui]  (use existing .env, no create/delete)
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createE2eProject } from "./e2e-create-project.mjs";
import { deleteE2eProject } from "./e2e-delete-project.mjs";

const ROOT = join(import.meta.dirname, "..");
const args = process.argv.slice(2);
const devMode = args.includes("--dev");
const uiMode = args.includes("--ui");
const pwArgs = args.filter((a) => a !== "--dev" && a !== "--ui");

function run(cmd, cmdArgs, env = process.env) {
  const r = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "inherit",
    shell: false,
  });
  return r.status ?? 1;
}

function sessionDir() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19).replace("T", "_");
  return join(ROOT, "test-results", stamp);
}

async function main() {
  let exitCode = 1;
  const outDir = sessionDir();
  mkdirSync(join(outDir, "tests"), { recursive: true });

  const logPath = join(outDir, "run.log");
  const log = (line) => {
    console.log(line);
    try {
      writeFileSync(logPath, `${line}\n`, { flag: "a" });
    } catch {
      /* ignore */
    }
  };

  log(`[e2e] Session ${outDir}`);
  log(`[e2e] Mode: ${devMode ? "dev (existing Supabase)" : "isolated"}${uiMode ? " + UI" : ""}`);

  let e2eEnv = {};
  if (!devMode) {
    try {
      const { envPath } = await createE2eProject();
      e2eEnv = {
        E2E_ENV_FILE: envPath,
        E2E_SESSION_DIR: outDir,
      };
      log("[e2e] db:schema");
      if (run("node", ["scripts/db-apply-schema.mjs"], e2eEnv) !== 0) {
        throw new Error("db:schema failed");
      }
      log("[e2e] db:seed");
      if (run("node", ["scripts/db-seed.mjs"], e2eEnv) !== 0) {
        throw new Error("db:seed failed");
      }
    } catch (e) {
      log(`[e2e] Setup failed: ${e.message}`);
      await deleteE2eProject();
      process.exit(1);
    }
  } else {
    e2eEnv = { E2E_SESSION_DIR: outDir };
  }

  const playwrightArgs = ["playwright", "test", ...pwArgs];
  if (uiMode) playwrightArgs.push("--ui");

  const playwrightEnv = {
    ...e2eEnv,
    PLAYWRIGHT_BROWSERS_PATH: "",
  };

  log(`[e2e] playwright ${playwrightArgs.slice(1).join(" ")}`);
  try {
    exitCode = run("npx", playwrightArgs, playwrightEnv);
  } finally {
    if (!devMode) {
      log("[e2e] cleanup");
      await deleteE2eProject();
    }
  }

  log(`[e2e] Exit ${exitCode}`);
  process.exit(exitCode);
}

main().catch((e) => {
  console.error(e);
  deleteE2eProject().finally(() => process.exit(1));
});
