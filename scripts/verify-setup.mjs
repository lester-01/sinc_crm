#!/usr/bin/env node
/**
 * Setup verification for Student CRM.
 * Run: node scripts/verify-setup.mjs --phase=linux,node,cli
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hasCloudflareStackKeys,
  hasFrontendStackKeys,
  hasWorkerStackKeys,
  isPlaceholder,
  loadStackEnv,
} from "./lib/load-stack-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const MIN_NODE_MAJOR = 22;
const WRANGLER_BIN = join(ROOT, "worker", "node_modules", ".bin", "wrangler");
const SUPABASE_BIN = join(ROOT, "node_modules", ".bin", "supabase");
const STRICT = process.argv.includes("--strict");

const CORE_TABLES = [
  "profiles",
  "clients",
  "conversation_threads",
  "conversation_messages",
  "deals",
  "deal_stage_history",
  "deal_notes",
];

const phases = parseArgs(process.argv.slice(2));
const results = [];

function parseArgs(argv) {
  const out = new Set(["all"]);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--strict") continue;
    if (argv[i] === "--phase" && argv[i + 1]) {
      out.clear();
      argv[i + 1].split(",").forEach((p) => out.add(p.trim()));
      i++;
    } else if (argv[i].startsWith("--phase=")) {
      out.clear();
      argv[i]
        .slice("--phase=".length)
        .split(",")
        .forEach((p) => out.add(p.trim()));
    }
  }
  if (out.has("all")) {
    return new Set([
      "linux",
      "node",
      "cli",
      "env",
      "supabase-connect",
      "supabase",
      "cloudflare",
      "github",
    ]);
  }
  return out;
}

function shouldRun(phase) {
  return phases.has(phase);
}

function record(name, ok, detail = "", options = {}) {
  const warn = options.warn === true || (options.optional === true && !ok);
  results.push({ name, ok, detail, warn });
  const mark = ok ? "PASS" : warn ? "WARN" : "FAIL";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`[${mark}] ${name}${suffix}`);
}

function run(command, args = [], options = {}) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    ...options,
  });
}

function commandExists(cmd, args = ["--version"]) {
  const r = run(cmd, args);
  return r.status === 0;
}

function localCli(binPath, args = ["--version"]) {
  if (!existsSync(binPath)) return false;
  const r = run(binPath, args);
  return r.status === 0;
}

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const env = {};
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

function loadEnv() {
  return loadStackEnv().merged;
}

function wranglerWhoami(extraEnv = {}) {
  if (!existsSync(WRANGLER_BIN)) {
    return { ok: false, out: "wrangler not installed" };
  }
  const r = run(WRANGLER_BIN, ["whoami"], {
    env: { ...process.env, ...extraEnv },
  });
  const out = `${r.stdout || ""}${r.stderr || ""}`.trim();
  const ok =
    r.status === 0 && !out.toLowerCase().includes("not authenticated");
  return { ok, out };
}

function supabasePublicKey(env) {
  return env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
}

function supabaseSecretKey(env) {
  return env.SUPABASE_SECRET_KEY;
}

function majorNodeVersion() {
  const r = run("node", ["-v"]);
  if (r.status !== 0) return null;
  const m = (r.stdout || r.stderr || "").trim().match(/^v(\d+)/);
  return m ? Number(m[1]) : null;
}

function readProcVersion() {
  try {
    return readFileSync("/proc/version", "utf8");
  } catch {
    return "";
  }
}

// --- Phase: linux ---
function verifyLinux() {
  const isLinux = run("uname", ["-s"]).stdout?.trim() === "Linux";
  record(
    "Platform: Linux",
    isLinux,
    isLinux ? "" : "Linux or WSL required — see docs/quick-start.md",
  );
  if (!isLinux) return;

  const procVersion = readProcVersion();
  const isWsl = /microsoft/i.test(procVersion);
  record(
    "Platform: WSL vs native",
    true,
    isWsl ? "WSL detected" : "native Linux",
  );

  record("git available", commandExists("git", ["--version"]));
  record(
    "curl available",
    commandExists("curl", ["--version"]),
    commandExists("curl", ["--version"]) ? "" : "required for setup:node (nvm install)",
  );
}

// --- Phase: node ---
function verifyNode() {
  const nodeMajor = majorNodeVersion();
  record(
    "Node.js installed",
    nodeMajor !== null,
    nodeMajor === null ? "node not found — run: npm run setup:node" : `v${nodeMajor}`,
  );
  record(
    `Node.js >= ${MIN_NODE_MAJOR}`,
    nodeMajor !== null && nodeMajor >= MIN_NODE_MAJOR,
    nodeMajor === null ? "" : `need >= ${MIN_NODE_MAJOR} — run: npm run setup:node`,
  );
  record("npm available", commandExists("npm", ["-v"]));

  const nvmDir = process.env.NVM_DIR || join(process.env.HOME || "", ".nvm");
  const nvmPresent = existsSync(join(nvmDir, "nvm.sh"));
  record(
    "nvm available (optional)",
    true,
    nvmPresent ? `found at ${nvmDir}` : "not detected — OK if Node 22+ is active",
    { optional: true },
  );
}

// --- Phase: cli ---
function verifyCli() {
  const wranglerOk = localCli(WRANGLER_BIN);
  record(
    "wrangler CLI (worker/)",
    wranglerOk,
    wranglerOk ? WRANGLER_BIN : "run: npm run setup:cli",
  );

  const supabaseOk = localCli(SUPABASE_BIN);
  record(
    "supabase CLI (root/)",
    supabaseOk,
    supabaseOk ? SUPABASE_BIN : "run: npm run setup:cli",
  );
}

// --- Phase: cloudflare ---
function verifyCloudflare() {
  if (!localCli(WRANGLER_BIN)) {
    record("wrangler CLI available", false, "run: npm run setup:cli");
    return;
  }

  const cloudflareEnvPath = join(ROOT, "worker", ".cloudflare.env");
  const merged = loadEnv();
  const hasCfKeys = hasCloudflareStackKeys(merged);
  const cfFileExists = existsSync(cloudflareEnvPath);
  record(
    "worker/.cloudflare.env exists (optional if env has token)",
    cfFileExists || hasCfKeys,
    cfFileExists
      ? cloudflareEnvPath
      : hasCfKeys
        ? "CLOUDFLARE_API_TOKEN from environment"
        : "copy worker/.cloudflare.env.example or export CLOUDFLARE_API_TOKEN",
  );

  const token = merged.CLOUDFLARE_API_TOKEN;
  record(
    "Cloudflare: CLOUDFLARE_API_TOKEN configured",
    hasCfKeys,
    hasCfKeys
      ? "set (env or file)"
      : "export CLOUDFLARE_API_TOKEN or use worker/.cloudflare.env — see docs/deploy-guide.md",
  );

  if (!hasCfKeys) {
    record(
      "Cloudflare: wrangler whoami (scoped API token)",
      false,
      "set CLOUDFLARE_API_TOKEN before verify — see docs/cloudflare-auth.md",
    );
    return;
  }

  const tokenEnv = { CLOUDFLARE_API_TOKEN: token };
  if (merged.CLOUDFLARE_ACCOUNT_ID && !isPlaceholder(merged.CLOUDFLARE_ACCOUNT_ID)) {
    tokenEnv.CLOUDFLARE_ACCOUNT_ID = merged.CLOUDFLARE_ACCOUNT_ID;
  }
  const withToken = wranglerWhoami(tokenEnv);
  record(
    "Cloudflare: wrangler whoami (scoped API token)",
    withToken.ok,
    withToken.ok
      ? withToken.out.split("\n")[0] || "authenticated via token"
      : "whoami failed — check token permissions and CLOUDFLARE_ACCOUNT_ID",
  );
}

// --- Phase: env ---
function verifyEnv() {
  const envPath = join(ROOT, ".env");
  const envExists = existsSync(envPath);
  const env = loadEnv();
  const hasFrontend = hasFrontendStackKeys(env);

  record(
    ".env file exists (optional if env has frontend keys)",
    envExists || hasFrontend,
    envExists
      ? envPath
      : hasFrontend
        ? "VITE_SUPABASE_* from environment"
        : "copy .env.example → .env or export frontend keys",
  );

  const workerVarsPath = join(ROOT, "worker", ".dev.vars");
  const workerVarsExists = existsSync(workerVarsPath);
  const hasWorker = hasWorkerStackKeys(env);
  record(
    "worker/.dev.vars exists (optional if env has worker keys)",
    workerVarsExists || hasWorker,
    workerVarsExists
      ? workerVarsPath
      : hasWorker
        ? "SUPABASE_* from environment"
        : "copy worker/.dev.vars.example or export worker keys",
  );

  const cloudflareEnvPath = join(ROOT, "worker", ".cloudflare.env");
  const hasCf = hasCloudflareStackKeys(env);
  const cfPresent = existsSync(cloudflareEnvPath) || hasCf;
  record(
    "worker/.cloudflare.env (optional for local dev)",
    true,
    cfPresent
      ? cfPresent && existsSync(cloudflareEnvPath)
        ? cloudflareEnvPath
        : "CLOUDFLARE_API_TOKEN from environment"
      : "not set — OK for P1 local dev; required for deploy (P3)",
    { optional: true },
  );

  const rootEnvOnly = envExists ? parseEnvFile(envPath) : {};
  const supabaseUrl = env.VITE_SUPABASE_URL;
  record(
    "env: VITE_SUPABASE_URL",
    Boolean(supabaseUrl && !isPlaceholder(supabaseUrl)),
    supabaseUrl ? "set" : "missing or placeholder",
  );

  const publicKey = supabasePublicKey(env);
  record(
    "env: VITE_SUPABASE_PUBLISHABLE_KEY",
    Boolean(publicKey && !isPlaceholder(publicKey)),
    publicKey ? "set" : "missing or placeholder",
  );

  const apiUrl = env.VITE_API_BASE_URL;
  record(
    "env: VITE_API_BASE_URL",
    Boolean(apiUrl && !isPlaceholder(apiUrl)),
    apiUrl || "missing — use http://localhost:8787 for local dev",
  );

  const secretInRoot = rootEnvOnly.SUPABASE_SECRET_KEY;
  if (secretInRoot && !isPlaceholder(secretInRoot)) {
    record(
      "env: secret key not in .env (security)",
      false,
      "move SUPABASE_SECRET_KEY to worker/.dev.vars only",
    );
  } else {
    record("env: secret key not in .env (security)", true, "OK");
  }

  record(
    "worker secrets: SUPABASE_URL",
    Boolean(
      (env.SUPABASE_URL || env.VITE_SUPABASE_URL) &&
        !isPlaceholder(env.SUPABASE_URL || env.VITE_SUPABASE_URL),
    ),
    env.SUPABASE_URL || env.VITE_SUPABASE_URL ? "set" : "missing or placeholder",
  );
  if (
    env.SUPABASE_PUBLISHABLE_KEY &&
    !isPlaceholder(env.SUPABASE_PUBLISHABLE_KEY)
  ) {
    record(
      "worker/.dev.vars: SUPABASE_SECRET_KEY",
      false,
      "SUPABASE_PUBLISHABLE_KEY belongs in .env — use SUPABASE_SECRET_KEY here",
    );
  } else {
    const secret = supabaseSecretKey(env);
    record(
      "worker/.dev.vars: SUPABASE_SECRET_KEY",
      Boolean(secret && !isPlaceholder(secret)),
      secret ? "set" : "missing or placeholder",
    );
  }
}

// --- Phase: supabase-connect ---
async function verifySupabaseConnect() {
  const env = loadEnv();
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const publicKey = supabasePublicKey(env);

  if (!url || isPlaceholder(url)) {
    record("Supabase URL configured", false, "set VITE_SUPABASE_URL in .env");
    return;
  }
  if (!publicKey || isPlaceholder(publicKey)) {
    record(
      "Supabase public key configured",
      false,
      "set VITE_SUPABASE_PUBLISHABLE_KEY in .env",
    );
    return;
  }

  record("Supabase URL configured", true, url);
  record("Supabase public key configured", true);

  try {
    const authRes = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publicKey },
    });
    const authOk = authRes.ok || authRes.status === 401;
    record(
      "Supabase Auth reachable",
      authOk,
      authOk
        ? `HTTP ${authRes.status}`
        : `HTTP ${authRes.status} — check URL and publishable key`,
    );
    if (!authOk) return;
  } catch (e) {
    record("Supabase Auth reachable", false, e.message);
    return;
  }

  const serviceKey = supabaseSecretKey(env);
  if (!serviceKey || isPlaceholder(serviceKey)) {
    record(
      "Supabase secret key",
      false,
      "set SUPABASE_SECRET_KEY in worker/.dev.vars",
    );
    return;
  }

  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });
    const body = await res.text();
    const missing = body.includes("PGRST205") || body.includes("does not exist");
    if (missing) {
      record(
        "Supabase secret key (API reachable)",
        true,
        "schema not applied yet — run npm run db:schema",
      );
      return;
    }
    record(
      "Supabase secret key (profiles read)",
      res.ok,
      res.ok ? "OK" : `HTTP ${res.status} — check SUPABASE_SECRET_KEY`,
    );
  } catch (e) {
    record("Supabase secret key (API reachable)", false, e.message);
  }
}

// --- Phase: supabase ---
async function verifySupabaseSchema() {
  const env = loadEnv();
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const publicKey = supabasePublicKey(env);

  if (!url || !publicKey) {
    record("Supabase URL configured", false, "set VITE_SUPABASE_URL in .env");
    record(
      "Supabase public key configured",
      false,
      "set VITE_SUPABASE_PUBLISHABLE_KEY in .env",
    );
    return;
  }

  record("Supabase URL configured", true, url);

  try {
    const authRes = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: publicKey },
    });
    record(
      "Supabase Auth reachable",
      authRes.ok || authRes.status === 401,
      `HTTP ${authRes.status}`,
    );
  } catch (e) {
    record("Supabase Auth reachable", false, e.message);
  }

  for (const table of CORE_TABLES) {
    try {
      const res = await fetch(
        `${url}/rest/v1/${table}?select=*&limit=1`,
        {
          headers: {
            apikey: publicKey,
            Authorization: `Bearer ${publicKey}`,
          },
        },
      );
      const body = await res.text();
      const missing = body.includes("PGRST205") || body.includes("does not exist");
      const rlsOnly =
        res.status === 401 ||
        (res.status === 200 && !missing) ||
        res.status === 406;
      const ok = res.ok || rlsOnly || (res.status === 200 && !missing);
      record(
        `Supabase table: ${table}`,
        ok && !missing,
        missing
          ? "table missing — run npm run db:schema"
          : res.ok
            ? "OK"
            : `HTTP ${res.status} (table may exist; RLS can block publishable reads)`,
      );
    } catch (e) {
      record(`Supabase table: ${table}`, false, e.message);
    }
  }

  const serviceKey = supabaseSecretKey(env);
  if (serviceKey && !isPlaceholder(serviceKey)) {
    try {
      const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      record(
        "Supabase secret key (profiles read)",
        res.ok,
        res.ok ? "OK" : `HTTP ${res.status} — check SUPABASE_SECRET_KEY`,
      );
    } catch (e) {
      record("Supabase secret key (profiles read)", false, e.message);
    }
  } else {
    record(
      "Supabase secret key (optional until worker/.dev.vars)",
      true,
      "SUPABASE_SECRET_KEY not in env — add to worker/.dev.vars later",
    );
  }
}

// --- Phase: github (P2 stub — WARN, exit 0 unless --strict) ---
function verifyGithub() {
  console.log(
    "\n[INFO] P2 GitHub verify — partial stub; full CI/OAuth wiring deferred.",
  );
  console.log("[INFO] Manual step: git remote add origin <your-public-repo-url>\n");

  const r = run("git", ["remote", "-v"]);
  const hasOrigin =
    r.status === 0 && (r.stdout || "").includes("origin");
  record(
    "git remote origin configured",
    hasOrigin,
    hasOrigin ? "" : "git remote add origin <your-public-repo-url>",
    { warn: !hasOrigin },
  );

  if (hasOrigin) {
    const url = (r.stdout || "").match(/origin\s+(\S+)/)?.[1] ?? "";
    record(
      "git origin URL (heuristic)",
      true,
      url || "verify this is your public fork/repo",
      { optional: true },
    );

    const fetch = run("git", ["fetch", "origin", "--dry-run"]);
    const fetchOk = fetch.status === 0;
    record(
      "git fetch origin (dry-run)",
      fetchOk,
      fetchOk
        ? "remote reachable"
        : (fetch.stderr || fetch.stdout || "fetch failed").trim().split("\n")[0],
      { warn: !fetchOk },
    );
  }
}

// --- Phase: scaffold ---
function verifyScaffold() {
  const workerToml = join(ROOT, "worker", "wrangler.toml");
  const workerIndex = join(ROOT, "worker", "src", "index.ts");
  const workerPkgPath = join(ROOT, "worker", "package.json");
  const hasWorker = existsSync(workerToml) && existsSync(workerIndex);
  record(
    "worker/wrangler.toml exists",
    existsSync(workerToml),
    existsSync(workerToml) ? "" : "run: npm run setup:worker",
  );
  record(
    "worker/src/index.ts exists",
    existsSync(workerIndex),
    existsSync(workerIndex) ? "" : "run: npm run setup:worker",
  );

  let hasHono = false;
  if (existsSync(workerPkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(workerPkgPath, "utf8"));
      hasHono = Boolean(pkg.dependencies?.hono);
    } catch {
      hasHono = false;
    }
  }
  record(
    "worker: hono dependency",
    hasHono,
    hasHono ? "" : "run: npm run setup:worker",
  );

  const middlewareAuth = join(ROOT, "worker", "src", "middleware", "auth.ts");
  record(
    "worker: auth middleware",
    existsSync(middlewareAuth),
    existsSync(middlewareAuth) ? "" : "missing middleware/auth.ts",
  );

  if (!hasWorker || !hasHono) {
    record("worker backend scaffold", false, "run: npm run setup:worker");
  } else {
    record("worker backend scaffold", true);
  }

  const viteConfig = join(ROOT, "vite.config.ts");
  const mainTsx = join(ROOT, "src", "main.tsx");
  const routerTsx = join(ROOT, "src", "app", "router.tsx");
  const supabaseClient = join(ROOT, "src", "lib", "supabaseClient.ts");
  const apiClient = join(ROOT, "src", "lib", "apiClient.ts");

  record("vite.config.ts exists", existsSync(viteConfig));
  record("src/main.tsx exists", existsSync(mainTsx));
  record("src/app/router.tsx exists", existsSync(routerTsx));
  record("src/lib/supabaseClient.ts exists", existsSync(supabaseClient));
  record("src/lib/apiClient.ts exists", existsSync(apiClient));

  let hasReact = false;
  const rootPkg = join(ROOT, "package.json");
  if (existsSync(rootPkg)) {
    try {
      const pkg = JSON.parse(readFileSync(rootPkg, "utf8"));
      hasReact = Boolean(pkg.dependencies?.react);
    } catch {
      hasReact = false;
    }
  }
  record("root: react dependency", hasReact, hasReact ? "" : "run: npm run setup:frontend");

  const shadcnUi = join(ROOT, "src", "components", "ui", "button.tsx");
  record("shadcn/ui base (Button)", existsSync(shadcnUi));

  const pages = [
    "LoginPage.tsx",
    "DashboardPage.tsx",
    "ClientsPage.tsx",
    "ClientDetailPage.tsx",
    "ConversationPage.tsx",
    "PipelinePage.tsx",
    "DealDetailPage.tsx",
  ];
  const missingPage = pages.find((p) => !existsSync(join(ROOT, "src", "pages", p)));
  record(
    "architecture pages scaffold",
    !missingPage,
    missingPage ? `missing src/pages/${missingPage}` : "all 7 pages present",
  );

  const hasFrontend =
    existsSync(viteConfig) &&
    existsSync(mainTsx) &&
    existsSync(routerTsx) &&
    hasReact;
  record(
    "frontend SPA scaffold (root src/)",
    hasFrontend,
    hasFrontend ? "" : "run: npm run setup:frontend",
  );
}

// --- Phase: deploy ---
async function verifyDeploy() {
  const env = loadEnv();
  const apiUrl = (env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  if (!apiUrl || apiUrl.includes("localhost") || apiUrl.includes("127.0.0.1")) {
    record(
      "Production API URL (VITE_API_BASE_URL)",
      true,
      "not set or still local — OK before deploy",
    );
    return;
  }

  try {
    const healthUrl = `${apiUrl}/api/health`;
    const res = await fetch(healthUrl, { method: "GET" });
    const ok = res.status === 200;
    record(
      "Production API reachable",
      ok,
      ok ? healthUrl : `${healthUrl} → HTTP ${res.status}`,
    );
  } catch (e) {
    record("Production API reachable", false, e.message);
  }
}

function summarize() {
  const requiredFails = results.filter((r) => !r.ok && !r.warn);
  const warns = results.filter((r) => !r.ok && r.warn);

  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (warns.length) {
    console.log(`Warnings: ${warns.length}`);
    for (const w of warns) {
      console.log(`  - ${w.name}${w.detail ? `: ${w.detail}` : ""}`);
    }
  }
  if (requiredFails.length) {
    console.log(`Failed (action required): ${requiredFails.length}`);
    for (const f of requiredFails) {
      console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  }
  if (STRICT && warns.length) {
    console.log("Strict mode: treating warnings as failures.");
    process.exit(1);
  }
  console.log("Verification complete for selected phase(s).");
}

async function main() {
  console.log(`Verifying setup (phases: ${[...phases].join(", ")})...\n`);

  if (shouldRun("linux")) verifyLinux();
  if (shouldRun("node")) verifyNode();
  if (shouldRun("cli")) verifyCli();
  if (shouldRun("cloudflare")) verifyCloudflare();
  if (shouldRun("env")) verifyEnv();
  if (shouldRun("supabase-connect")) await verifySupabaseConnect();
  if (shouldRun("supabase")) await verifySupabaseSchema();
  if (shouldRun("github")) verifyGithub();
  if (shouldRun("scaffold")) verifyScaffold();
  if (shouldRun("deploy")) await verifyDeploy();

  summarize();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
