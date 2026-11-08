/**
 * Custom domain support for deploy:all (Pass 2).
 *
 * The Worker only accepts browser calls from origins listed in the CORS_ORIGINS
 * secret, and Supabase Auth only redirects to URLs in its allow list. When the app
 * is served from a custom domain (for example https://crm.example.com) as well as
 * its stable pages.dev URL, both places need that origin too. Set
 * EXTRA_CORS_ORIGINS in .env (comma-separated) and deploy:all handles both.
 */

/**
 * Parse a comma / whitespace / newline separated list of https origins.
 * Paths and trailing slashes are dropped; duplicates are removed.
 *
 * @param {string | undefined | null} raw
 * @returns {string[]}
 */
export function parseExtraOrigins(raw) {
  const origins = [];
  for (const part of String(raw ?? "").split(/[\s,]+/)) {
    const value = part.trim();
    if (!value) continue;
    let url;
    try {
      url = new URL(value);
    } catch {
      throw new Error(
        `EXTRA_CORS_ORIGINS: "${value}" is not a valid URL. Use full origins such as https://crm.example.com`,
      );
    }
    if (url.protocol !== "https:") {
      throw new Error(
        `EXTRA_CORS_ORIGINS: "${value}" must use https. (localhost:5173 is already allowed by the Worker.)`,
      );
    }
    if (!origins.includes(url.origin)) origins.push(url.origin);
  }
  return origins;
}

/**
 * Value for the Worker CORS_ORIGINS secret: the stable Pages origin first,
 * then any extra (custom domain) origins.
 *
 * @param {string} pagesOrigin e.g. https://sinc-crm-esg.pages.dev
 * @param {string | undefined | null} extraRaw EXTRA_CORS_ORIGINS
 * @returns {string} comma-separated, no spaces
 */
export function buildCorsOrigins(pagesOrigin, extraRaw) {
  const primary = new URL(pagesOrigin).origin;
  const all = [primary];
  for (const origin of parseExtraOrigins(extraRaw)) {
    if (!all.includes(origin)) all.push(origin);
  }
  return all.join(",");
}
