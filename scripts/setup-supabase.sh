#!/usr/bin/env bash
# Configure and verify hosted Supabase credentials for local development.
#
# Usage: npm run setup:supabase
#        SKIP_VERIFY=1 npm run setup:supabase

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }

main() {
  log "=========================================="
  log "SINC CRM — setup:supabase"
  log "Repository: $ROOT"
  log "=========================================="

  step "Check Supabase credentials (env and/or dotenv files)"
  node "$ROOT/scripts/lib/require-supabase.mjs"

  if [[ "$SKIP_VERIFY" == "1" ]]; then
    log "SKIP_VERIFY=1 — skipping verify:supabase"
    log "When keys are pasted, run: npm run verify:supabase"
    exit 0
  fi

  step "verify:supabase — env, connectivity, schema"
  (cd "$ROOT" && npm run verify:supabase)

  log "=========================================="
  log "setup:supabase finished."
  log "  npm run db:schema && npm run db:seed"
  log "=========================================="
}

main "$@"
