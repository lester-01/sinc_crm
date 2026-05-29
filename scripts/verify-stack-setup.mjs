#!/usr/bin/env node
/**
 * Stack setup verification for Student CRM.
 * Run: npm run verify:stack [-- --phase=all|local|cloud|cloudflare|env|supabase|supabase-connect|github|scaffold|deploy]
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
      "local",
      "cloudflare",
      "env",
      "supabase",
      "github",
    ]);
  }
  if (out.has("cloud")) {
    return new Set(["env", "cloudflare", "github", "supabase-connect"]);
  }
  if (out.has("full")) {
    return new Set([
      "local",
      "cloudflare",
      "env",
      "supabase",
      "github",
      "scaffold",
      "deploy",
    ]);
  }
  return out;
}

function shouldRun(phase) {
  return phases.has(phase);
}

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  const mark = ok ? "PASS" : "FAIL";
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

// --- Phase: local ---
function verifyLocal() {
  const nodeMajor = majorNodeVersion();
  record(
    "Node.js installed",
    nodeMajor !== null,
    nodeMajor === null ? "node not found" : `v${nodeMajor}`,
  );
  record(
    `Node.js >= ${MIN_NODE_MAJOR}`,
    nodeMajor !== null && nodeMajor >= MIN_NODE_MAJOR,
    nodeMajor === null ? "" : `need >= ${MIN_NODE_MAJOR}`,
  );
  record("npm available", commandExists("npm", ["-v"]));
  record("git available", commandExists("git", ["--version"]));
  const wranglerOk = localCli(WRANGLER_BIN);
  record(
    "wrangler CLI (worker/, local)",
    wranglerOk,
    wranglerOk ? WRANGLER_BIN : "run: npm run setup:local",
  );

  const supabaseOk = localCli(SUPABASE_BIN);
  record(
    "supabase CLI (root/, local)",
    supabaseOk,
    supabaseOk ? SUPABASE_BIN : "run: npm run setup:local",
  );
}

// --- Phase: cloudflare ---
function verifyCloudflare() {
  if (!localCli(WRANGLER_BIN)) {
    record("wrangler CLI available", false, "run: npm run setup:local");
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
      : "export CLOUDFLARE_API_TOKEN or use worker/.cloudflare.env — see docs/external-auth.md",
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
  record(
    "worker/.cloudflare.env exists (optional if env has token)",
    existsSync(cloudflareEnvPath) || hasCf,
    existsSync(cloudflareEnvPath)
      ? cloudflareEnvPath
      : hasCf
        ? "CLOUDFLARE_API_TOKEN from environment"
        : "copy worker/.cloudflare.env.example or export token",
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

// --- Phase: supabase-connect (Phase 4 — keys only, no schema) ---
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
        "schema not applied yet — expected before Phase 5 (database)",
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

// --- Phase: supabase (full — includes schema tables) ---
async function verifySupabase() {
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
        (res.status === 406);
      const ok = res.ok || rlsOnly || (res.status === 200 && !missing);
      record(
        `Supabase table: ${table}`,
        ok && !missing,
        missing
          ? "table missing — run schema SQL"
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

// --- Phase: github ---
function verifyGithub() {
  const r = run("git", ["remote", "-v"]);
  const hasOrigin =
    r.status === 0 && (r.stdout || "").includes("origin");
  record(
    "git remote origin configured",
    hasOrigin,
    hasOrigin ? "" : "git remote add origin <your-public-repo-url>",
  );

  if (hasOrigin) {
    const url = (r.stdout || "").match(/origin\s+(\S+)/)?.[1] ?? "";
    record(
      "git origin URL (heuristic)",
      true,
      url || "verify this is your public fork/repo",
    );

    const fetch = run("git", ["fetch", "origin", "--dry-run"]);
    const fetchOk = fetch.status === 0;
    record(
      "git fetch origin (dry-run)",
      fetchOk,
      fetchOk
        ? "remote reachable"
        : (fetch.stderr || fetch.stdout || "fetch failed").trim().split("\n")[0],
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
    existsSync(workerToml) ? "" : "run Phase 2 backend scaffold",
  );
  record(
    "worker/src/index.ts exists",
    existsSync(workerIndex),
    existsSync(workerIndex) ? "" : "run Phase 2 backend scaffold",
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
    record("worker backend scaffold", false, "complete Phase 2");
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
    hasFrontend ? "" : "complete Phase 3",
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
  const failed = results.filter((r) => !r.ok);
  const optionalFails = failed.filter((r) =>
    r.name.includes("optional") || r.name.includes("heuristic"),
  );
  const requiredFails = failed.filter(
    (r) => !optionalFails.includes(r),
  );

  console.log("\n--- Summary ---");
  console.log(`Passed: ${results.filter((r) => r.ok).length}/${results.length}`);
  if (requiredFails.length) {
    console.log(`Failed (action required): ${requiredFails.length}`);
    for (const f of requiredFails) {
      console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    process.exit(1);
  }
  if (optionalFails.length) {
    console.log(`Optional/skipped: ${optionalFails.length}`);
  }
  console.log("Stack verification complete for selected phase(s).");
}

async function main() {
  console.log(`Verifying stack setup (phases: ${[...phases].join(", ")})...\n`);

  if (shouldRun("local")) verifyLocal();
  if (shouldRun("cloudflare")) verifyCloudflare();
  if (shouldRun("env")) verifyEnv();
  if (shouldRun("supabase-connect")) await verifySupabaseConnect();
  if (shouldRun("supabase")) await verifySupabase();
  if (shouldRun("github")) verifyGithub();
  if (shouldRun("scaffold")) verifyScaffold();
  if (shouldRun("deploy")) await verifyDeploy();

  summarize();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
