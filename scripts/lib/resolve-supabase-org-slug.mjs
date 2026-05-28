/**
 * E2E org reference: SUPABASE_ORG_SLUG (dashboard URL segment …/org/<slug>/…).
 * @param {Record<string, string>} env
 * @returns {string | undefined}
 */
export function resolveSupabaseOrgSlug(env) {
  const slug = env.SUPABASE_ORG_SLUG?.trim();
  return slug || undefined;
}
