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
  "$WRANGLER_BIN" pages deploy "$ROOT/dist" --project-name="$PAGES_PROJECT_NAME"

  log ""
  log "Pages deployed. Add the Pages URL to:"
  log "  1. worker CORS_ORIGINS secret (comma-separated if multiple)"
  log "  2. Supabase Auth → URL Configuration → Site URL + Redirect URLs"
  log "Then redeploy worker if CORS changed: npm run deploy:worker"
}

main "$@"
