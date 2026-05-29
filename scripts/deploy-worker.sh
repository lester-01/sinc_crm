#!/usr/bin/env bash
# Deploy the Hono API to Cloudflare Workers.
# Prerequisites: worker/.cloudflare.env or CLOUDFLARE_* env; Worker secrets set (see docs/deploy-guide.md).
#
# Usage: npm run deploy:worker

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

main() {
  log ">>> Cloudflare auth"
  bash "$ROOT/scripts/ensure-cloudflare-auth.sh"

  if [[ ! -x "$ROOT/worker/node_modules/.bin/wrangler" ]]; then
    err "Wrangler not found. Run: npm run setup:local"
    exit 1
  fi

  log ">>> Deploy Worker (sinc-crm-api)"
  log "Ensure production secrets are set: SUPABASE_URL, SUPABASE_SECRET_KEY, CORS_ORIGINS"
  log "  cd worker && npx wrangler secret list"
  log "  See docs/deploy-guide.md — Worker secrets"

  (cd "$ROOT/worker" && npx wrangler deploy)

  log ""
  log "Worker deployed. Copy the workers.dev URL from the line above (Published …)."
  log "Pass 1: set VITE_API_BASE_URL in .env.production → npm run deploy:pages"
  log "Pass 2: CORS_ORIGINS + Supabase Auth URLs = stable Pages URL (not the deployment preview URL)"
  log "Full steps: docs/deploy-guide.md"
}

main "$@"
