#!/usr/bin/env bash
# Build the Vite SPA and deploy to Cloudflare Pages.
#
# Usage: npm run deploy:pages
#        PAGES_PROJECT_NAME=my-crm npm run deploy:pages

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PAGES_PROJECT_NAME="${PAGES_PROJECT_NAME:-sinc-crm}"
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

main() {
  if [[ ! -f "$ROOT/.env.production" ]]; then
    err "Missing .env.production — copy .env.production.example and set production URLs."
    err "See docs/deploy-guide.md"
    exit 1
  fi

  if [[ ! -x "$WRANGLER_BIN" ]]; then
    err "Wrangler not found. Run: npm run setup:local"
    exit 1
  fi

  log ">>> Cloudflare auth"
  bash "$ROOT/scripts/ensure-cloudflare-auth.sh"

  log ">>> Build frontend (Vite production — reads .env.production)"
  (cd "$ROOT" && npm run build)

  if [[ ! -d "$ROOT/dist" ]]; then
    err "Build did not produce dist/"
    exit 1
  fi

  log ">>> Deploy to Cloudflare Pages (project: $PAGES_PROJECT_NAME)"
  log "    (Wrangler may print a deployment preview URL — ignore it; see stable URL below.)"
  "$WRANGLER_BIN" pages deploy "$ROOT/dist" --project-name="$PAGES_PROJECT_NAME"

  stable_domain=""
  if stable_domain="$(
    cd "$ROOT/worker" && "$WRANGLER_BIN" pages project list --json 2>/dev/null | node -e "
      const name = process.argv[1];
      const rows = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      const row = rows.find((r) => r['Project Name'] === name);
      if (!row) process.exit(1);
      const domains = String(row['Project Domains'] ?? '').split(',').map((s) => s.trim()).filter(Boolean);
      if (domains[0]) console.log(domains[0]);
    " "$PAGES_PROJECT_NAME"
  )"; then
    :
  else
    stable_domain="${PAGES_PROJECT_NAME}.pages.dev"
    log "WARN: Could not read project domain from wrangler; guessed https://${stable_domain}"
  fi

  log ""
  log "Pages deployed."
  log ""
  log "  USE THIS (stable production URL):"
  log "    https://${stable_domain}"
  log ""
  log "  Do NOT use the deployment preview URL from Wrangler output above"
  log "  (e.g. https://<hash>.${stable_domain}) — it changes every deploy and breaks CORS unless listed separately."
  log ""
  log "Pass 2 (docs/deploy-guide.md):"
  log "  CORS_ORIGINS=https://${stable_domain}"
  log "  Supabase Dashboard → Authentication → URL configuration → same origin"
  log "Then: npm run verify:stack:deploy"
}

main "$@"
