/**
 * Cloudflare REST helpers for deploy automation (no stdout parsing, no local URL files).
 *
 * Worker URL: GET /accounts/:id/workers/subdomain + script name from wrangler.toml
 * Pages: GET /accounts/:id/pages/projects → project_name + subdomain (stable hostname)
 */

import { readFileSync } from "node:fs";

const CF_API = "https://api.cloudflare.com/client/v4";

/** Shown when API returns auth errors (e.g. code 10000). */
export const CF_API_PERMISSION_HINT =
  "ALERT: Cloudflare API authentication failed. Update CLOUDFLARE_API_TOKEN permissions: " +
  "Account → Account Settings → Read; Account → Workers Scripts → Edit; " +
  "Account → Cloudflare Pages → Read and Edit. " +
  "See docs/cloudflare-auth.md — then re-run deploy.";

/**
 * @param {unknown} body
 * @param {string} context
 */
function assertCfSuccess(body, context) {
  if (body?.success) return;
  const code = body?.errors?.[0]?.code;
  const msg = body?.errors?.[0]?.message ?? "unknown error";
  const authHint = code === 10000 || /auth/i.test(msg) ? `\n\n${CF_API_PERMISSION_HINT}` : "";
  throw new Error(`Cloudflare API ${context} failed: ${msg}${authHint}`);
}

/**
 * @param {string} accountId
 * @param {string} token
 */
export async function fetchWorkersDevSubdomain(accountId, token) {
  const res = await fetch(`${CF_API}/accounts/${accountId}/workers/subdomain`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assertCfSuccess(body, "workers/subdomain");
  if (!body.result?.subdomain) {
    throw new Error("Cloudflare API workers/subdomain returned no subdomain");
  }
  return String(body.result.subdomain);
}

/**
 * @param {string} workerName e.g. sinc-crm-api
 * @param {string} accountSubdomain e.g. prinxlexter
 */
export function buildWorkerUrl(workerName, accountSubdomain) {
  return `https://${workerName}.${accountSubdomain}.workers.dev`.replace(/\/$/, "");
}

/**
 * @param {string} accountId
 * @param {string} token
 * @param {string} scriptName
 */
export async function ensureWorkerSubdomainEnabled(accountId, token, scriptName) {
  const url = `${CF_API}/accounts/${accountId}/workers/scripts/${encodeURIComponent(scriptName)}/subdomain`;
  const getRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const getBody = await getRes.json();
  if (getBody.success && getBody.result?.enabled) {
    return;
  }
  const postRes = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ enabled: true, previews_enabled: true }),
  });
  const postBody = await postRes.json();
  assertCfSuccess(postBody, "enable worker subdomain");
}

/**
 * @param {{ accountId: string, token: string, workerName: string }} opts
 */
export async function resolveWorkerUrlViaApi(opts) {
  const { accountId, token, workerName } = opts;
  await ensureWorkerSubdomainEnabled(accountId, token, workerName);
  const subdomain = await fetchWorkersDevSubdomain(accountId, token);
  return buildWorkerUrl(workerName, subdomain);
}

/** @param {string} wranglerTomlPath */
export function readWorkerNameFromToml(wranglerTomlPath) {
  const text = readFileSync(wranglerTomlPath, "utf8");
  const m = text.match(/^\s*name\s*=\s*"([^"]+)"/m);
  if (!m) throw new Error(`Could not read name= from ${wranglerTomlPath}`);
  return m[1];
}

/**
 * @param {unknown} project Cloudflare Pages API project object
 */
export function apiProjectToListRow(project) {
  const projectName = project.name ?? project.project_name;
  if (!projectName) return null;
  const pagesDev =
    project.subdomain ??
    project.domains?.find((d) => typeof d === "string" && d.endsWith(".pages.dev"));
  const domain = pagesDev
    ? String(pagesDev).replace(/^https?:\/\//, "").split("/")[0]
    : "";
  return {
    "Project Name": projectName,
    "Project Domains": domain,
  };
}

/**
 * Fetch Pages projects via Cloudflare API (required for deploy URL resolution).
 *
 * @param {string} accountId
 * @param {string} token
 * @returns {Promise<Array<{ "Project Name": string, "Project Domains": string }>>}
 */
export async function fetchPagesProjectsViaApi(accountId, token) {
  const res = await fetch(`${CF_API}/accounts/${accountId}/pages/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  assertCfSuccess(body, "pages/projects");
  const projects = body.result ?? [];
  return projects.map(apiProjectToListRow).filter(Boolean);
}

/**
 * Stable Pages hostname from API list rows (Project Domains column).
 *
 * @param {unknown} rows
 * @param {string} projectName
 */
export function parsePagesStableDomain(rows, projectName) {
  if (!Array.isArray(rows)) throw new Error("pages project list: expected array");
  const row = rows.find((r) => r["Project Name"] === projectName);
  if (!row) return null;
  const domain = String(row["Project Domains"] ?? "").trim();
  return domain || null;
}

/**
 * @param {string} domain e.g. sinc-crm-esg.pages.dev
 */
export function buildPagesOrigin(domain) {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
  return `https://${host}`;
}

/**
 * Resolve stable Pages origin via API. Fails if subdomain cannot be read.
 *
 * @param {{ accountId: string, token: string, projectName: string, rows?: unknown }} opts
 */
export async function resolvePagesOriginViaApi(opts) {
  const { accountId, token, projectName } = opts;
  const rows = opts.rows ?? (await fetchPagesProjectsViaApi(accountId, token));
  const domain = parsePagesStableDomain(rows, projectName);
  if (!domain) {
    throw new Error(
      `Cloudflare API: no Project Domains for Pages project "${projectName}". ` +
        `Run: curl -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" ` +
        `"${CF_API}/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects"`,
    );
  }
  return buildPagesOrigin(domain);
}

/**
 * Default Pages project name when creating a new project (Worker name minus -api).
 *
 * @param {string} workerName e.g. sinc-crm-api
 */
export function defaultPagesProjectFromWorkerName(workerName) {
  if (workerName.endsWith("-api")) return workerName.slice(0, -4);
  return workerName;
}

/**
 * Pages --project-name from API list or Worker default (sinc-crm-api → sinc-crm).
 *
 * @param {{ rows: unknown, workerName: string }} opts
 * @returns {{ name: string, source: string }}
 */
export function resolvePagesProjectName(opts) {
  const { rows, workerName } = opts;
  const defaultName = defaultPagesProjectFromWorkerName(workerName);

  if (!Array.isArray(rows)) {
    throw new Error("Pages project list required — Cloudflare API pages/projects must succeed.");
  }

  const names = rows
    .map((r) => r["Project Name"])
    .filter((n) => typeof n === "string" && n.length > 0);

  if (names.length === 1) {
    return { name: names[0], source: "only Pages project in account (API)" };
  }
  if (names.includes(defaultName)) {
    return { name: defaultName, source: `Worker default (${workerName} → ${defaultName})` };
  }
  if (names.length > 1) {
    throw new Error(
      `Multiple Pages projects (${names.join(", ")}). ` +
        `Remove extra projects in Cloudflare or deploy with wrangler pages deploy --project-name manually.`,
    );
  }

  return { name: defaultName, source: `Worker default (${workerName} → ${defaultName}, new project)` };
}
