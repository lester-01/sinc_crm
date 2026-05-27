#!/usr/bin/env bash
# Phase 4 — cloud accounts, env files, and connectivity (merged old phases 4 + 5).
# Does NOT copy .env or .dev.vars — you must copy examples and paste keys first.
#
# Usage: npm run setup:cloud
#        SKIP_CLOUD_VERIFY=1 npm run setup:cloud

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SKIP_CLOUD_VERIFY="${SKIP_CLOUD_VERIFY:-0}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

require_env_files() {
  local missing=0
  if [[ ! -f "$ROOT/.env" ]]; then
    err "Missing .env — copy .env.example to .env and paste Supabase + API URL keys."
    missing=1
  fi
  if [[ ! -f "$ROOT/worker/.dev.vars" ]]; then
    err "Missing worker/.dev.vars — copy worker/.dev.vars.example and paste Supabase secrets."
    missing=1
  fi
  if [[ ! -f "$ROOT/worker/.cloudflare.env" ]]; then
    err "Missing worker/.cloudflare.env — copy worker/.cloudflare.env.example and set CLOUDFLARE_API_TOKEN."
    missing=1
  fi
  if [[ "$missing" -ne 0 ]]; then
    err "See docs/quick-start.md — Environment files (Phase 4)."
    exit 1
  fi
}

main() {
  log "=========================================="
  log "SINC CRM — Phase 4: cloud + credentials"
  log "Repository: $ROOT"
  log "=========================================="

  step "Check env files exist (you copy examples; installer does not)"
  require_env_files

  step "Cloudflare authentication (scoped API token required)"
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
  log "=========================================="
}

main "$@"
