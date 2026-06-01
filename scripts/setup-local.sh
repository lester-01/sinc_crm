#!/usr/bin/env bash
# One-shot machine bootstrap for Linux/WSL local development.
#
# Usage: npm run setup:local
#        SKIP_VERIFY=1 npm run setup:local

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }

main() {
  log "=========================================="
  log "SINC CRM — setup:local (machine bootstrap)"
  log "Repository: $ROOT"
  log "=========================================="

  step "Verify Linux / WSL platform"
  (cd "$ROOT" && npm run verify:linux)

  step "setup:node — nvm + Node 22+"
  bash "$ROOT/scripts/setup-node.sh"

  step "setup:cli — wrangler + supabase CLI"
  bash "$ROOT/scripts/setup-cli.sh"

  if [[ "$SKIP_VERIFY" == "1" ]]; then
    log "SKIP_VERIFY=1 — skipping verify:local"
  else
    step "verify:local — machine readiness"
    (cd "$ROOT" && npm run verify:local)
  fi

  log "=========================================="
  log "setup:local finished."
  log "  Next: copy .env.example → .env, then npm run setup:supabase"
  log "  docs/quick-start.md"
  log "=========================================="
}

main "$@"
