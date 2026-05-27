#!/usr/bin/env bash
# Install Worker runtime dependencies (Hono, Supabase, jose, zod).
# Requires Node 22+. Safe to re-run.
#
# Usage: npm run setup:worker

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKER_DIR="$ROOT/worker"
MIN_NODE_MAJOR=22

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

node_major() {
  command -v node >/dev/null 2>&1 || { echo 0; return; }
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

main() {
  log "=== Worker dependencies installer ==="
  log "Directory: $WORKER_DIR"
  log ""

  local major
  major="$(node_major)"
  if [[ -z "$major" || "$major" -lt "$MIN_NODE_MAJOR" ]]; then
    err "Node $(node -v 2>/dev/null || echo missing) is below ${MIN_NODE_MAJOR}."
    err "Run: npm run install:linux   (or: nvm use 22)"
    exit 1
  fi
  log "Node $(node -v) OK"

  if [[ ! -f "$WORKER_DIR/package.json" ]]; then
    err "Missing worker/package.json"
    exit 1
  fi

  cd "$WORKER_DIR"
  log "Running npm install in worker/..."
  npm install

  log ""
  log "Checking runtime packages..."
  npm ls hono @supabase/supabase-js jose zod @hono/zod-validator --depth=0 >/dev/null 2>&1 || {
    err "Some worker dependencies are missing. Check worker/package.json."
    exit 1
  }
  log "  OK: hono, @supabase/supabase-js, jose, zod, @hono/zod-validator"

  log ""
  log "Worker dependencies ready."
  log "Next: npm run verify:stack:scaffold"
}

main "$@"
