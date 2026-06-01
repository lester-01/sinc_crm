#!/usr/bin/env bash
# Deploy the Hono API to Cloudflare Workers.
# Prerequisites: CLOUDFLARE_* in .env or environment; Worker secrets set (see docs/deploy-guide.md).
#
# Usage: npm run deploy:worker

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

main() {
  # shellcheck source=scripts/lib/cloudflare-env.sh
  source "$ROOT/scripts/lib/cloudflare-env.sh"
  log ">>> Cloudflare auth"
  if ! export_cloudflare_env; then
    exit 1
  fi
  if ! "$ROOT/worker/node_modules/.bin/wrangler" whoami >/dev/null 2>&1; then
    err "wrangler whoami failed — check CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID"
    exit 1
  fi
  log "Cloudflare API token active in this shell (not a child process)."

  if [[ ! -x "$ROOT/worker/node_modules/.bin/wrangler" ]]; then
    err "Wrangler not found. Run: npm run setup:cli"
    exit 1
  fi

  log ">>> Deploy Worker (sinc-crm-api)"
  log "Ensure production secrets are set: SUPABASE_URL, SUPABASE_SECRET_KEY, CORS_ORIGINS"
  log "  cd worker && npx wrangler secret list"
  log "  See docs/deploy-guide.md — Worker secrets"

  (cd "$ROOT/worker" && npx wrangler deploy)  # inherits CLOUDFLARE_* from export above

  log ""
  log "Worker deployed. Copy the workers.dev URL from the line above (Published …)."
  log "Pass 1: set VITE_API_BASE_URL in root .env → npm run deploy:pages"
  log "Pass 2: CORS_ORIGINS + Supabase Auth URLs = stable Pages URL (not the deployment preview URL)"
  log "Full steps: docs/deploy-guide.md"
}

main "$@"
