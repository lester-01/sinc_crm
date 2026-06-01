#!/usr/bin/env node
/**
 * Two-pass production deploy (Supabase + Cloudflare Worker + Pages).
 *
 * URLs: Cloudflare API only (Worker subdomain + Pages projects list). Fails if API unavailable.
 * Pages project name: Worker default (sinc-crm-api → sinc-crm) or API list.
 * Supabase Auth URLs: Management API PATCH /config/auth (requires SUPABASE_ACCESS_TOKEN).
 *
 * Prerequisites (gitignored):
 *   worker/.cloudflare.env  — CLOUDFLARE_API_TOKEN (Pages Read+Edit, Workers Edit), CLOUDFLARE_ACCOUNT_ID
 *   worker/.dev.vars        — SUPABASE_* , SUPABASE_ACCESS_TOKEN , SUPABASE_DB_URL (db:schema)
 *   .env                    — VITE_*
 *
 * Usage:
 *   npm run deploy:all
 *   npm run deploy:all -- --skip-db --skip-seed
 *   npm run deploy:all -- --dry-run
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CF_API_PERMISSION_HINT,
  defaultPagesProjectFromWorkerName,
  fetchPagesProjectsViaApi,
  parsePagesStableDomain,
  readWorkerNameFromToml,
  resolvePagesOriginViaApi,
  resolvePagesProjectName,
  resolveWorkerUrlViaApi,
} from "./lib/cloudflare-api.mjs";
import {
  getProjectRef,
  getSupabaseUrl,
  isCiEnvironment,
  loadStackEnv,
} from "./lib/load-stack-env.mjs";
import {
  SUPABASE_AUTH_CONFIG_HINT,
  syncProductionAuthUrls,
} from "./lib/supabase-auth-config.mjs";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const WORKER_DIR = join(ROOT, "worker");
const WRANGLER = join(WORKER_DIR, "node_modules", ".bin", "wrangler");
const WORKER_NAME = readWorkerNameFromToml(join(WORKER_DIR, "wrangler.toml"));
const PAGES_BRANCH = process.env.PAGES_BRANCH ?? "development";

const argv = process.argv.slice(2);
if (argv.includes("--help") || argv.includes("-h")) {
  console.log(`Usage: npm run deploy:all -- [flags]

Flags (must come after -- when using npm):
  --skip-db     Skip npm run db:schema and db:seed (existing Supabase schema)
  --skip-seed   Skip db:seed only
  --dry-run     Print plan; call APIs for URLs but skip wrangler/npm deploy steps

Or:  npm run deploy:all:skip-db
Or:  SKIP_DB=1 npm run deploy:all

npm run deploy:all --skip-db does NOT pass --skip-db to this script (npm swallows it).`);
  process.exit(0);
}

const args = new Set(argv);
const DRY_RUN = args.has("--dry-run");
const SKIP_DB = args.has("--skip-db") || process.env.SKIP_DB === "1";
const SKIP_SEED = args.has("--skip-seed") || SKIP_DB;

function log(msg) {
  console.log(msg);
}

function fail(msg) {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

function failApi(err, context) {
  const message = err instanceof Error ? err.message : String(err);
  fail(`${context}: ${message}`);
}

function run(cmd, cmdArgs, { cwd = ROOT, env = process.env, label } = {}) {
  const name = label ?? [cmd, ...cmdArgs].join(" ");
  log(`>>> ${name}`);
  if (DRY_RUN) {
    log("    (dry-run, skipped)");
    return { status: 0 };
  }
  const result = spawnSync(cmd, cmdArgs, {
    cwd,
    env: { ...env },
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    fail(`${name} exited ${result.status ?? "unknown"}`);
  }
  return result;
}

function requireDeployCredentials() {
  run("node", ["scripts/lib/require-supabase.mjs"], { label: "require-supabase" });
  run("node", ["scripts/lib/require-cloudflare.mjs"], {
    label: "require-cloudflare",
  });

  const { merged } = loadStackEnv();
  if (!merged.CLOUDFLARE_ACCOUNT_ID) {
    fail("CLOUDFLARE_ACCOUNT_ID is required for API-based URL resolution.");
  }
  if (!merged.SUPABASE_ACCESS_TOKEN?.trim()) {
    fail(SUPABASE_AUTH_CONFIG_HINT);
  }
  return merged;
}

function applyMergedToProcessEnv(merged) {
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && String(v).trim() !== "") {
      process.env[k] = String(v);
    }
  }
}

/** @param {string} accountId @param {string} token */
async function loadPagesRows(accountId, token) {
  try {
    return await fetchPagesProjectsViaApi(accountId, token);
  } catch (err) {
    failApi(err, "Cloudflare Pages API");
  }
}

async function ensurePagesProject(pagesProject, pagesRows) {
  if (DRY_RUN) {
    log(`Pages project "${pagesProject}" (dry-run, skip create check).`);
    return;
  }
  if (parsePagesStableDomain(pagesRows, pagesProject)) {
    log(`Pages project "${pagesProject}" already exists.`);
    return;
  }
  log(`Creating Pages project "${pagesProject}" (production branch: ${PAGES_BRANCH})...`);
  const create = spawnSync(
    WRANGLER,
    ["pages", "project", "create", pagesProject, "--production-branch", PAGES_BRANCH],
    { cwd: WORKER_DIR, env: process.env, stdio: "inherit" },
  );
  if (create.status !== 0) {
    fail("wrangler pages project create failed");
  }
}

async function main() {
  if (!existsSync(WRANGLER)) {
    fail("Wrangler not found. Run: npm run setup:cli");
  }

  if (isCiEnvironment()) {
    log("CI=true — OAuth will not be used; credentials must be in env.");
  }

  const merged = requireDeployCredentials();
  applyMergedToProcessEnv(merged);

  const accountId = merged.CLOUDFLARE_ACCOUNT_ID;
  const token = merged.CLOUDFLARE_API_TOKEN;
  const supabaseUrl = getSupabaseUrl(merged);

  if (!DRY_RUN) {
    run(WRANGLER, ["whoami"], { cwd: WORKER_DIR, label: "wrangler whoami" });
  }

  log("\n=== Pass 1a — Database (optional) ===\n");
  if (SKIP_DB) {
    log("Skipping db:schema and db:seed (--skip-db or SKIP_DB=1).");
  } else {
    run("npm", ["run", "db:schema"], { label: "npm run db:schema" });
    if (!SKIP_SEED) {
      run("npm", ["run", "db:seed"], { label: "npm run db:seed" });
    }
  }

  log("\n=== Pass 1b — Deploy Worker ===\n");
  run(WRANGLER, ["deploy"], { cwd: WORKER_DIR, label: "wrangler deploy" });

  log("\n=== Resolve Worker URL (Cloudflare API) ===\n");
  let workerUrl;
  if (DRY_RUN) {
    const existing = merged.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";
    workerUrl =
      existing && !existing.includes("localhost") && !existing.includes("127.0.0.1")
        ? existing
        : `https://${WORKER_NAME}.<account>.workers.dev`;
    log(`Worker URL (dry-run; API skipped): ${workerUrl}`);
  } else {
    try {
      workerUrl = await resolveWorkerUrlViaApi({ accountId, token, workerName: WORKER_NAME });
    } catch (err) {
      failApi(err, "Worker URL API");
    }
    log(`Worker URL: ${workerUrl}`);
  }

  log("\n=== Pass 1c — Build SPA with production API URL ===\n");
  const buildEnv = {
    ...process.env,
    VITE_SUPABASE_URL: merged.VITE_SUPABASE_URL || merged.SUPABASE_URL,
    VITE_SUPABASE_PUBLISHABLE_KEY:
      merged.VITE_SUPABASE_PUBLISHABLE_KEY || merged.SUPABASE_PUBLISHABLE_KEY,
    VITE_API_BASE_URL: workerUrl,
  };
  run("npm", ["run", "build"], { env: buildEnv, label: "npm run build" });

  log("\n=== Pass 1d — Deploy Pages ===\n");
  let pagesRows;
  if (!DRY_RUN) {
    pagesRows = await loadPagesRows(accountId, token);
  } else {
    try {
      pagesRows = await loadPagesRows(accountId, token);
      log("Pages list loaded via API (dry-run).");
    } catch (err) {
      log(`Dry-run: Pages API unavailable — ${err instanceof Error ? err.message : err}`);
      pagesRows = null;
    }
  }

  let pagesProject;
  let pagesSource;
  try {
    if (!pagesRows && DRY_RUN) {
      pagesProject = defaultPagesProjectFromWorkerName(WORKER_NAME);
      pagesSource = "Worker default (dry-run, API list failed)";
    } else {
      ({ name: pagesProject, source: pagesSource } = resolvePagesProjectName({
        rows: pagesRows,
        workerName: WORKER_NAME,
      }));
    }
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }
  log(`Pages project: ${pagesProject} (from ${pagesSource})`);

  await ensurePagesProject(pagesProject, pagesRows ?? []);
  if (!existsSync(join(ROOT, "dist")) && !DRY_RUN) {
    fail("dist/ missing after build");
  }
  run(
    WRANGLER,
    [
      "pages",
      "deploy",
      join(ROOT, "dist"),
      "--project-name",
      pagesProject,
      "--branch",
      PAGES_BRANCH,
    ],
    { cwd: WORKER_DIR, label: "wrangler pages deploy" },
  );

  log("\n=== Resolve stable Pages URL (Cloudflare API) ===\n");
  let pagesOrigin;
  if (DRY_RUN) {
    if (pagesRows) {
      const domain = parsePagesStableDomain(pagesRows, pagesProject);
      if (!domain) {
        fail(
          `API has no subdomain for project "${pagesProject}". ${CF_API_PERMISSION_HINT}`,
        );
      }
      pagesOrigin = `https://${domain.replace(/^https?:\/\//, "")}`;
    } else {
      fail(
        `Dry-run cannot resolve stable Pages URL without API. Fix token permissions.\n\n${CF_API_PERMISSION_HINT}`,
      );
    }
  } else {
    pagesRows = await loadPagesRows(accountId, token);
    try {
      pagesOrigin = await resolvePagesOriginViaApi({
        accountId,
        token,
        projectName: pagesProject,
        rows: pagesRows,
      });
    } catch (err) {
      failApi(err, "Stable Pages URL API");
    }
  }
  log(`Stable Pages URL (use this, not the preview hash URL): ${pagesOrigin}`);

  log("\n=== Pass 2 — Worker secrets + Supabase Auth URLs ===\n");
  const corsHost = pagesOrigin.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const lines = [
    `SUPABASE_URL=${merged.SUPABASE_URL || merged.VITE_SUPABASE_URL}`,
    `SUPABASE_SECRET_KEY=${merged.SUPABASE_SECRET_KEY}`,
    `CORS_ORIGINS=https://${corsHost}`,
  ];
  log(">>> Upload Worker secrets (wrangler secret bulk)");
  if (DRY_RUN) {
    log(`    Would upload: ${lines.map((l) => l.split("=")[0]).join(", ")}`);
  } else {
    const { writeFileSync } = await import("node:fs");
    const secretsPath = join(WORKER_DIR, ".deploy-secrets.tmp");
    writeFileSync(secretsPath, `${lines.join("\n")}\n`, "utf8");
    run(WRANGLER, ["secret", "bulk", secretsPath], {
      cwd: WORKER_DIR,
      label: "wrangler secret bulk",
    });
  }

  const projectRef = getProjectRef(merged);
  const accessToken = merged.SUPABASE_ACCESS_TOKEN.trim();
  log(">>> Supabase Auth URL configuration (Management API)");
  if (DRY_RUN) {
    log(`    Would PATCH /v1/projects/${projectRef}/config/auth`);
    log(`      site_url: ${pagesOrigin}`);
    log(`      uri_allow_list: ${pagesOrigin}, http://localhost:5173, http://localhost:5173/**`);
  } else {
    try {
      const auth = await syncProductionAuthUrls(accessToken, projectRef, pagesOrigin);
      log(`Supabase site_url: ${auth.site_url}`);
      log(`Supabase redirect URLs updated (includes localhost for dev).`);
    } catch (err) {
      failApi(err, "Supabase Auth config API");
    }
  }

  log("\n=== Deploy summary ===\n");
  log(`Worker=${workerUrl}`);
  log(`Pages=${pagesOrigin}`);
  log(`Supabase=${supabaseUrl}`);

  log("\nOptional: npm run verify:deploy");
  log("Optional: DEPLOY_PAGES_URL + DEPLOY_API_URL playwright smoke (see deploy-guide.md)");
  log("\nDeploy complete.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
