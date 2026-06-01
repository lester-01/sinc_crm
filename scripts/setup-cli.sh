#!/usr/bin/env bash
# Install project-local CLI tooling (wrangler + supabase) via npm install.
# Requires Node.js >= 22 — run npm run setup:node first if needed.
#
# Usage: npm run setup:cli
#        bash scripts/setup-cli.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_NODE_MAJOR=22
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"
SUPABASE_BIN="$ROOT/node_modules/.bin/supabase"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return
  fi
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

require_node() {
  local major
  major="$(node_major)"
  if [[ -n "$major" && "$major" -ge "$MIN_NODE_MAJOR" ]]; then
    log "Node $(node -v) meets requirement (>= ${MIN_NODE_MAJOR}.0.0)."
    return 0
  fi
  err "Node $(node -v 2>/dev/null || echo 'not installed') is below required >= ${MIN_NODE_MAJOR}.0.0."
  err "Run: npm run setup:node"
  exit 1
}

npm_install_dir() {
  local dir="$1"
  local label="$2"

  if [[ ! -f "$dir/package.json" ]]; then
    err "Missing package.json in $dir"
    exit 1
  fi

  log ""
  log "=== npm install: $label ($dir) ==="
  cd "$dir"

  if [[ -d node_modules ]] && [[ -f package-lock.json ]]; then
    log "node_modules present; running npm install to sync dependencies..."
  else
    log "Installing dependencies..."
  fi

  if npm install; then
    return 0
  fi

  log "npm install failed; retrying once after brief pause..."
  sleep 2
  npm install
}

verify_binary() {
  local bin_path="$1"
  local name="$2"

  if [[ ! -x "$bin_path" ]]; then
    err "$name not found at $bin_path after install."
    exit 1
  fi
  log "OK: $("$bin_path" --version 2>&1 | head -1)"
}

main() {
  log "SINC CRM — setup:cli (wrangler + supabase CLI)"
  log "Project root: $ROOT"

  require_node

  npm_install_dir "$ROOT" "root (supabase CLI + app deps)"
  npm_install_dir "$ROOT/worker" "worker (wrangler)"

  log ""
  log "=== Verifying installed CLIs ==="
  verify_binary "$WRANGLER_BIN" "wrangler"
  verify_binary "$SUPABASE_BIN" "supabase"

  log ""
  log "setup:cli complete."
  log "  npm run verify:cli"
}

main "$@"
