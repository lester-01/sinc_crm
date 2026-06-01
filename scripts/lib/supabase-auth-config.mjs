/**
 * Supabase Auth URL configuration via Management API (Pass 2 of deploy:all).
 *
 * PATCH /v1/projects/{ref}/config/auth
 * Requires SUPABASE_ACCESS_TOKEN with auth_config_write (or project_admin_write).
 */

import { managementFetch } from "./supabase-management.mjs";

export const SUPABASE_AUTH_CONFIG_HINT =
  "SUPABASE_ACCESS_TOKEN required in .env (or env) with auth_config_write. " +
  "Create at https://supabase.com/dashboard/account/tokens — see docs/deploy-guide.md";

/**
 * @param {string | undefined | null} existing
 * @param {string[]} urls
 */
export function mergeUriAllowList(existing, urls) {
  const set = new Set();
  for (const line of String(existing ?? "").split("\n")) {
    for (const part of line.split(",")) {
      const t = part.trim();
      if (t) set.add(t);
    }
  }
  for (const u of urls) {
    const t = u.trim().replace(/\/$/, "");
    if (t) set.add(t);
  }
  return [...set].join("\n");
}

/**
 * @param {string} token
 * @param {string} ref
 */
export async function getAuthConfig(token, ref) {
  return managementFetch(`/projects/${ref}/config/auth`, { token });
}

/**
 * @param {string} token
 * @param {string} ref
 * @param {Record<string, unknown>} patch
 */
export async function patchAuthConfig(token, ref, patch) {
  return managementFetch(`/projects/${ref}/config/auth`, {
    method: "PATCH",
    token,
    body: patch,
  });
}

/**
 * Set Site URL + Redirect URLs for production Pages origin (keeps localhost for dev).
 *
 * @param {string} token SUPABASE_ACCESS_TOKEN
 * @param {string} ref project ref
 * @param {string} pagesOrigin e.g. https://sinc-crm-esg.pages.dev
 */
export async function syncProductionAuthUrls(token, ref, pagesOrigin) {
  const siteUrl = pagesOrigin.replace(/\/$/, "");
  const current = await getAuthConfig(token, ref);
  const uriAllowList = mergeUriAllowList(current.uri_allow_list, [
    siteUrl,
    "http://localhost:5173",
    "http://localhost:5173/**",
  ]);
  await patchAuthConfig(token, ref, {
    site_url: siteUrl,
    uri_allow_list: uriAllowList,
  });
  return { site_url: siteUrl, uri_allow_list: uriAllowList };
}
