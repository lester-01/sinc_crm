#!/usr/bin/env bash
# Cloudflare authentication and connectivity for deploy (P3).
#
# Usage: npm run setup:cloudflare
#        SKIP_VERIFY=1 npm run setup:cloudflare

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_VERIFY="${SKIP_VERIFY:-0}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }

main() {
  log "=========================================="
  log "SINC CRM — setup:cloudflare"
  log "Repository: $ROOT"
  log "=========================================="

  step "Check Cloudflare credentials (env and/or dotenv files)"
  node "$ROOT/scripts/lib/require-cloudflare.mjs"

  step "Cloudflare authentication"
  bash "$ROOT/scripts/ensure-cloudflare-auth.sh"

  if [[ "$SKIP_VERIFY" == "1" ]]; then
    log "SKIP_VERIFY=1 — skipping verify:cloudflare"
    log "When keys are pasted, run: npm run verify:cloudflare"
    exit 0
  fi

  step "verify:cloudflare"
  (cd "$ROOT" && npm run verify:cloudflare)

  log "=========================================="
  log "setup:cloudflare finished."
  log "  docs/deploy-guide.md"
  log "=========================================="
}

main "$@"
