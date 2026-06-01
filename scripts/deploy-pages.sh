#!/usr/bin/env bash
# Build the Vite SPA and deploy to Cloudflare Pages.
#
# Usage: npm run deploy:pages
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"
PAGES_TARGET="$ROOT/scripts/lib/pages-deploy-target.mjs"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

main() {
  # shellcheck disable=SC2046
  eval "$(
    node -e "
      import { loadStackEnv } from './scripts/lib/load-stack-env.mjs';
      const { merged } = loadStackEnv();
      for (const k of ['VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY','VITE_API_BASE_URL','CLOUDFLARE_API_TOKEN','CLOUDFLARE_ACCOUNT_ID']) {
        if (merged[k]) console.log('export '+k+'='+JSON.stringify(String(merged[k])));
      }
    "
  )"
  if [[ -z "${VITE_SUPABASE_URL:-}" ]]; then
    err "Missing VITE_SUPABASE_URL — set in .env or use npm run deploy:all"
    exit 1
  fi

  if [[ ! -x "$WRANGLER_BIN" ]]; then
    err "Wrangler not found. Run: npm run setup:cli"
    exit 1
  fi

  # shellcheck source=scripts/lib/cloudflare-env.sh
  source "$ROOT/scripts/lib/cloudflare-env.sh"
  log ">>> Cloudflare auth"
  if ! export_cloudflare_env; then
    exit 1
  fi

  if [[ -z "${VITE_API_BASE_URL:-}" || "${VITE_API_BASE_URL}" == *"localhost"* ]]; then
    err "Set VITE_API_BASE_URL to your deployed Worker URL before deploy:pages"
    err "Or use: npm run deploy:all (sets it from Cloudflare API)"
    exit 1
  fi

  PAGES_PROJECT_NAME="$(node "$PAGES_TARGET" project)"
  if [[ -z "$PAGES_PROJECT_NAME" ]]; then
    err "Could not resolve Pages project name via Cloudflare API."
    exit 1
  fi

  log ">>> Build frontend (Vite production — VITE_* from environment)"
  (
    cd "$ROOT" && \
      VITE_SUPABASE_URL="${VITE_SUPABASE_URL:-}" \
      VITE_SUPABASE_PUBLISHABLE_KEY="${VITE_SUPABASE_PUBLISHABLE_KEY:-}" \
      VITE_API_BASE_URL="${VITE_API_BASE_URL}" \
      npm run build
  )

  if [[ ! -d "$ROOT/dist" ]]; then
    err "Build did not produce dist/"
    exit 1
  fi

  log ">>> Deploy to Cloudflare Pages (project: $PAGES_PROJECT_NAME)"
  log "    (Wrangler may print a deployment preview URL — ignore it; stable URL from API below.)"
  "$WRANGLER_BIN" pages deploy "$ROOT/dist" --project-name="$PAGES_PROJECT_NAME"

  STABLE_ORIGIN="$(node "$PAGES_TARGET" origin)"
  if [[ -z "$STABLE_ORIGIN" ]]; then
    err "Could not resolve stable Pages URL via Cloudflare API."
    exit 1
  fi

  log ""
  log "Pages deployed."
  log ""
  log "  USE THIS (stable production URL from API):"
  log "    $STABLE_ORIGIN"
  log ""
  log "  Do NOT use the deployment preview URL from Wrangler output above"
  log "  (https://<hash>.<project-domains>) — it changes every deploy."
  log ""
  log "Pass 2 (docs/deploy-guide.md):"
  log "  CORS_ORIGINS=$STABLE_ORIGIN"
  log "  Supabase Dashboard → Authentication → URL configuration → same origin"
  log "Then: npm run verify:deploy"
}

main "$@"
