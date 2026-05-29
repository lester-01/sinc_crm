#!/usr/bin/env node
/**
 * Optional check: can this repo likely run GitHub Actions workflows?
 * Not required for local dev or E2E.
 *
 * Auth order: (1) repo access without API, (2) GITHUB_TOKEN/GH_TOKEN, (3) gh OAuth.
 *
 * Run: npm run verify:github-actions
 *      npm run verify:github-actions -- --strict
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseGithubRemote } from "./lib/github-remote.mjs";
import { isCiEnvironment } from "./lib/load-stack-env.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const strict = process.argv.includes("--strict");
const results = [];

function run(command, args = [], cwd = ROOT) {
  return spawnSync(command, args, {
    encoding: "utf8",
    shell: false,
    cwd,
  });
}

function commandExists(cmd, args = ["--version"]) {
  return run(cmd, args).status === 0;
}

function record(name, ok, detail = "", optional = false) {
  results.push({ name, ok, detail, optional });
  const mark = ok ? "PASS" : optional ? "WARN" : "FAIL";
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`[${mark}] ${name}${suffix}`);
}

function resolveEnvToken() {
  const t = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  return t?.trim() || null;
}

function resolveGhOAuthToken() {
  if (!commandExists("gh")) return null;
  const auth = run("gh", ["auth", "status"]);
  if (auth.status !== 0) return null;
  const r = run("gh", ["auth", "token"]);
  if (r.status === 0 && (r.stdout || "").trim()) {
    return r.stdout.trim();
  }
  return null;
}

function ghJson(args) {
  const r = run("gh", args);
  if (r.status !== 0) {
    return { ok: false, error: (r.stderr || r.stdout || "gh failed").trim() };
  }
  try {
    return { ok: true, data: JSON.parse(r.stdout || "{}") };
  } catch {
    return { ok: false, error: "invalid JSON from gh" };
  }
}

async function fetchGithubApi(path, token) {
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "sinc-crm-verify-github-actions",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(`https://api.github.com${path}`, { headers });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { status: res.status, ok: res.ok, body };
  } catch (e) {
    return { status: 0, ok: false, body: { message: e.message } };
  }
}

async function checkRepoApi(repo, token, sourceLabel) {
  const repoApi = await fetchGithubApi(`/repos/${repo.owner}/${repo.repo}`, token);
  if (repoApi.ok && repoApi.body) {
    record(
      `Repository API (${sourceLabel})`,
      true,
      `${repo.owner}/${repo.repo}`,
      true,
    );
    const archived = repoApi.body.archived === true;
    const disabled = repoApi.body.disabled === true;
    record(
      "Repository not archived/disabled",
      !archived && !disabled,
      archived ? "archived" : disabled ? "disabled" : "",
      true,
    );
    return true;
  }
  record(
    `Repository API (${sourceLabel})`,
    false,
    repoApi.body?.message || `HTTP ${repoApi.status}`,
    true,
  );
  return false;
}

async function checkActionsApi(repo, token, sourceLabel) {
  const actionsPerm = await fetchGithubApi(
    `/repos/${repo.owner}/${repo.repo}/actions/permissions`,
    token,
  );
  if (actionsPerm.ok && actionsPerm.body) {
    const enabled = actionsPerm.body.enabled !== false;
    record(
      `GitHub Actions enabled (${sourceLabel})`,
      enabled,
      enabled
        ? `allowed_actions: ${actionsPerm.body.allowed_actions ?? "default"}`
        : "enable Actions in repo Settings → Actions",
      true,
    );
    return;
  }
  if (actionsPerm.status === 403) {
    record(
      `GitHub Actions permissions API (${sourceLabel})`,
      true,
      "token may lack admin:repo — verify Settings → Actions manually",
      true,
    );
    return;
  }
  record(
    `GitHub Actions permissions API (${sourceLabel})`,
    false,
    actionsPerm.body?.message || `HTTP ${actionsPerm.status}`,
    true,
  );
}

export async function verifyGithubActions(options = {}) {
  const root = options.root ?? ROOT;
  const runInRoot = (cmd, args) =>
    spawnSync(cmd, args, { encoding: "utf8", shell: false, cwd: root });

  console.log("GitHub Actions readiness (optional check)\n");
  console.log("Auth order: git access → GITHUB_TOKEN/GH_TOKEN → gh OAuth\n");

  const urlR = runInRoot("git", ["remote", "get-url", "origin"]);
  const originUrl = urlR.status === 0 ? (urlR.stdout || "").trim() : "";
  record(
    "git remote origin",
    Boolean(originUrl),
    originUrl || "git remote add origin <github-url>",
    false,
  );

  if (!originUrl) {
    summarize();
    return { results, hardFails: results.filter((r) => !r.ok && !r.optional) };
  }

  const repo = parseGithubRemote(originUrl);
  if (!repo) {
    record(
      "GitHub host",
      true,
      `origin is not github.com — ${originUrl}`,
      true,
    );
    summarize();
    return { results, hardFails: [] };
  }

  record("Parsed GitHub repo", true, `${repo.owner}/${repo.repo}`, true);

  // --- Step 1: Access without GitHub API token ---
  const fetchDry = runInRoot("git", ["fetch", "origin", "--dry-run"]);
  const fetchOk = fetchDry.status === 0;
  record(
    "Git remote reachable (git fetch --dry-run)",
    fetchOk,
    fetchOk
      ? "origin reachable with your git credentials"
      : (fetchDry.stderr || fetchDry.stdout || "fetch failed").trim().split("\n")[0],
    !fetchOk,
  );

  // Unauthenticated public repo probe (optional)
  const publicRepo = await fetchGithubApi(`/repos/${repo.owner}/${repo.repo}`, null);
  if (publicRepo.ok) {
    record(
      "Public repo metadata (no token)",
      true,
      publicRepo.body?.private === false ? "public" : "private repo",
      true,
    );
  } else if (publicRepo.status === 404) {
    record(
      "Public repo metadata (no token)",
      false,
      "not found or private — API token or gh login needed",
      true,
    );
  } else {
    record(
      "Public repo metadata (no token)",
      true,
      `HTTP ${publicRepo.status} — use token or gh for private repos`,
      true,
    );
  }

  // --- Step 2: Env PAT/token ---
  const envToken = resolveEnvToken();
  record(
    "GITHUB_TOKEN / GH_TOKEN in environment",
    Boolean(envToken),
    envToken ? "will use for API checks" : "not set — trying gh OAuth next",
    true,
  );

  let apiUsed = false;
  if (envToken) {
    apiUsed = await checkRepoApi(repo, envToken, "env token");
    if (apiUsed) await checkActionsApi(repo, envToken, "env token");
  }

  // --- Step 3: gh OAuth fallback ---
  const hasGh = commandExists("gh");
  record(
    "GitHub CLI (gh) installed",
    hasGh,
    hasGh ? "" : "optional: install gh for OAuth fallback",
    true,
  );

  if (!apiUsed) {
    if (isCiEnvironment()) {
      record(
        "GitHub API auth",
        false,
        "CI=true: set GITHUB_TOKEN or GH_TOKEN — browser OAuth is not available in CI",
        true,
      );
    } else if (!hasGh) {
      record(
        "GitHub API auth",
        false,
        "set GITHUB_TOKEN/GH_TOKEN or install gh and run: gh auth login",
        true,
      );
    } else {
      const authStatus = runInRoot("gh", ["auth", "status"]);
      const ghAuthed = authStatus.status === 0;
      record(
        "gh OAuth session",
        ghAuthed,
        ghAuthed ? "using gh auth token for API" : "run: gh auth login",
        true,
      );

      if (ghAuthed) {
        const oauthToken = resolveGhOAuthToken();
        if (oauthToken) {
          const ok = await checkRepoApi(repo, oauthToken, "gh OAuth");
          if (ok) await checkActionsApi(repo, oauthToken, "gh OAuth");
          apiUsed = ok;
        }

        if (!apiUsed) {
          const perm = ghJson([
            "api",
            `repos/${repo.owner}/${repo.repo}/actions/permissions`,
          ]);
          if (perm.ok) {
            const enabled = perm.data?.enabled !== false;
            record(
              "GitHub Actions enabled (gh api)",
              enabled,
              enabled ? "" : "enable in repo Settings → Actions",
              true,
            );
            apiUsed = true;
          }
        }
      }
    }
  }

  if (!apiUsed) {
    record(
      "GitHub API checks",
      false,
      "no working token — PAT needs repo scope; or gh auth login on desktop",
      true,
    );
  }

  record(
    "PAT scope note (optional)",
    true,
    "if using a PAT: repo (+ workflow to edit workflows); Actions enablement is a repo setting",
    true,
  );

  const workflowsDir = join(root, ".github", "workflows");
  record(
    "Local .github/workflows directory",
    existsSync(workflowsDir),
    existsSync(workflowsDir)
      ? "workflow file(s) present locally"
      : "created when CI is implemented (deferred)",
    true,
  );

  record(
    "CI recipe documented",
    existsSync(join(root, "docs", "ci-e2e-recipe.md")),
    "see docs/ci-e2e-recipe.md",
    true,
  );

  summarize();
  return { results, hardFails: results.filter((r) => !r.ok && !r.optional) };
}

function summarize() {
  console.log("\n--- Summary ---");
  const hardFails = results.filter((r) => !r.ok && !r.optional);
  const warns = results.filter((r) => !r.ok && r.optional);
  const passed = results.filter((r) => r.ok).length;
  console.log(`Checks: ${passed}/${results.length} passed`);
  if (warns.length) {
    console.log(`Warnings: ${warns.length}`);
  }
  if (hardFails.length) {
    console.log(`Required fixes: ${hardFails.length}`);
    for (const f of hardFails) {
      console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ""}`);
    }
    if (strict) process.exit(1);
  }
  console.log(
    "\nOptional check. CI on GitHub Actions uses the built-in GITHUB_TOKEN, not your PAT.",
  );
  process.exit(0);
}

const isMain =
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMain) {
  verifyGithubActions().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
