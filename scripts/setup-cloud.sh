#!/usr/bin/env bash
# Phase 4 — cloud accounts, env files, and connectivity (merged old phases 4 + 5).
# Dotenv files are optional when all required keys are already in the environment.
#
# Usage: npm run setup:cloud
#        SKIP_CLOUD_VERIFY=1 npm run setup:cloud

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_CLOUD_VERIFY="${SKIP_CLOUD_VERIFY:-0}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

main() {
  log "=========================================="
  log "SINC CRM — Phase 4: cloud + credentials"
  log "Repository: $ROOT"
  log "=========================================="

  step "Check stack credentials (env and/or dotenv files)"
  node "$ROOT/scripts/lib/require-stack-credentials.mjs"

  step "Cloudflare authentication"
  bash "$ROOT/scripts/ensure-cloudflare-auth.sh"

  if [[ "$SKIP_CLOUD_VERIFY" == "1" ]]; then
    log "SKIP_CLOUD_VERIFY=1 — skipping verify:stack:cloud"
    log "When keys are pasted, run: npm run verify:stack:cloud"
    exit 0
  fi

  step "Run cloud connectivity verification"
  (cd "$ROOT" && npm run verify:stack:cloud)

  log "=========================================="
  log "Phase 4 setup finished."
  log "  docs/stack-setup.md — Phase 4"
  log "  docs/external-auth.md — tooling auth ladder"
  log "=========================================="
}

main "$@"
