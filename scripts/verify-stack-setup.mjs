#!/usr/bin/env node
/**
 * Stack setup verification for Student CRM assessment.
 * Run: npm run verify:stack [-- --phase=all|local|cloudflare|env|supabase|github|scaffold|deploy]
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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

function run(command, args = []) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
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
  const rootEnv = parseEnvFile(join(ROOT, ".env"));
  const workerVars = parseEnvFile(join(ROOT, "worker", ".dev.vars"));
  return { ...rootEnv, ...workerVars };
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
    record("wrangler logged in", false, "run: npm run setup:local");
    return;
  }
  const r = run(WRANGLER_BIN, ["whoami"]);
  const ok = r.status === 0 && !(r.stdout || "").toLowerCase().includes("not authenticated");
  record(
    "wrangler logged in (wrangler whoami)",
    ok,
    ok ? (r.stdout || "").trim().split("\n")[0] : "run: wrangler login",
  );
}

// --- Phase: env ---
function verifyEnv() {
  const envPath = join(ROOT, ".env");
  const exists = existsSync(envPath);
  record(".env file exists", exists, exists ? envPath : "copy .env.example to .env");

  const env = loadEnv();
  const required = ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"];
  for (const key of required) {
    const val = env[key];
    record(
      `env: ${key}`,
      Boolean(val && val.length > 10 && !val.includes("your-")),
      val ? "set" : "missing or placeholder",
    );
  }

  const apiUrl = env.VITE_API_BASE_URL;
  record(
    "env: VITE_API_BASE_URL (optional until worker runs)",
    true,
    apiUrl || "not set — OK for Phase 1–4",
  );

  const workerVarsPath = join(ROOT, "worker", ".dev.vars");
  if (existsSync(workerVarsPath)) {
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    record(
      "worker/.dev.vars: SUPABASE_SERVICE_ROLE_KEY",
      Boolean(serviceKey && !serviceKey.includes("your-")),
      serviceKey ? "set" : "missing",
    );
  } else {
    record(
      "worker/.dev.vars (optional until worker scaffold)",
      true,
      "not created yet — OK before Phase 5",
    );
  }
}

// --- Phase: supabase ---
async function verifySupabase() {
  const env = loadEnv();
  const url = (env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").replace(/\/$/, "");
  const anonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    record("Supabase URL configured", false, "set VITE_SUPABASE_URL in .env");
    record("Supabase anon key configured", false, "set VITE_SUPABASE_ANON_KEY in .env");
    return;
  }

  record("Supabase URL configured", true, url);

  try {
    const authRes = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: anonKey },
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
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
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
            : `HTTP ${res.status} (table may exist; RLS can block anon reads)`,
      );
    } catch (e) {
      record(`Supabase table: ${table}`, false, e.message);
    }
  }

  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey && !serviceKey.includes("your-")) {
    try {
      const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
      });
      record(
        "Supabase service role (profiles read)",
        res.ok,
        res.ok ? "OK" : `HTTP ${res.status} — check service role key`,
      );
    } catch (e) {
      record("Supabase service role (profiles read)", false, e.message);
    }
  } else {
    record(
      "Supabase service role (optional until worker/.dev.vars)",
      true,
      "SUPABASE_SERVICE_ROLE_KEY not in env — add to worker/.dev.vars later",
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

  const frontendCandidates = [
    join(ROOT, "frontend", "package.json"),
    join(ROOT, "web", "package.json"),
    join(ROOT, "apps", "web", "package.json"),
  ];
  const pkgPath = frontendCandidates.find((p) => {
    if (!existsSync(p)) return false;
    if (p === join(ROOT, "package.json")) {
      try {
        const pkg = JSON.parse(readFileSync(p, "utf8"));
        return Boolean(pkg.dependencies?.react || pkg.devDependencies?.vite);
      } catch {
        return false;
      }
    }
    return true;
  });
  record(
    "frontend/ package (Phase 3 — optional for now)",
    Boolean(pkgPath),
    pkgPath || "not scaffolded yet — Phase 3",
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
    const healthUrl = `${apiUrl}/api/me`;
    const res = await fetch(healthUrl, { method: "GET" });
    record(
      "Production API reachable",
      res.status < 500,
      `${healthUrl} → HTTP ${res.status} (401 without token is fine)`,
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
