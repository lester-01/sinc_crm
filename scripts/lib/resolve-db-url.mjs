/**
 * Resolve Postgres URL from env only — no hardcoded region, host, or pooler version.
 *
 * Source of truth: SUPABASE_DB_URL copied from Supabase Dashboard
 * (Connect → Transaction pooler, port 6543 for serverless).
 *
 * Optional SUPABASE_DB_PASSWORD replaces [YOUR-PASSWORD] in the template URI.
 */

const PASSWORD_PLACEHOLDERS = ["[YOUR-PASSWORD]", "[PASSWORD]"];

function encodePasswordForUri(password) {
  return encodeURIComponent(password);
}

function hasPasswordPlaceholder(url) {
  return PASSWORD_PLACEHOLDERS.some((p) => url.includes(p));
}

/**
 * @returns {string | null} connection URI for supabase db query --db-url
 */
export function resolveDbUrl(merged) {
  const raw = (merged.SUPABASE_DB_URL || "").trim();
  if (!raw) return null;

  if (!hasPasswordPlaceholder(raw)) {
    return raw;
  }

  const password = merged.SUPABASE_DB_PASSWORD;
  if (!password || password.includes("your-")) {
    return null;
  }

  const encoded = encodePasswordForUri(password);
  let out = raw;
  for (const placeholder of PASSWORD_PLACEHOLDERS) {
    out = out.split(placeholder).join(encoded);
  }
  return out;
}

export function resolveDbUrlOrExplain(merged) {
  const raw = (merged.SUPABASE_DB_URL || "").trim();
  if (!raw) {
    return {
      url: null,
      error:
        "Missing SUPABASE_DB_URL in worker/.dev.vars.\n" +
        "Copy the Transaction pooler URI from Supabase Dashboard → Connect\n" +
        "(port 6543). See docs/database-setup.md.",
    };
  }

  if (hasPasswordPlaceholder(raw)) {
    const password = merged.SUPABASE_DB_PASSWORD;
    if (!password || password.includes("your-")) {
      return {
        url: null,
        error:
          "SUPABASE_DB_URL contains [YOUR-PASSWORD] but SUPABASE_DB_PASSWORD is not set.\n" +
          "Add the database password to worker/.dev.vars, or paste the full URI with password included.",
      };
    }
  }

  const url = resolveDbUrl(merged);
  if (!url) {
    return { url: null, error: "Could not resolve SUPABASE_DB_URL." };
  }

  return { url, error: null };
}
