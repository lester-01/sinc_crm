#!/usr/bin/env bash
# Install project-local CLI dependencies (wrangler in worker/, supabase at root).
# Requires Node.js >= 22 (wrangler 4.95.0 engine requirement).
#
# Usage: npm run setup:local
#        bash scripts/install-local-deps.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_NODE_MAJOR=22
INSTALL_LOCAL_REEXEC="${INSTALL_LOCAL_REEXEC:-0}"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return
  fi
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

node_ok() {
  local major
  major="$(node_major)"
  [[ -n "$major" && "$major" -ge "$MIN_NODE_MAJOR" ]]
}

try_upgrade_node() {
  # nvm (most common on WSL)
  local nvm_dir="${NVM_DIR:-$HOME/.nvm}"
  if [[ -s "$nvm_dir/nvm.sh" ]]; then
    # shellcheck source=/dev/null
    source "$nvm_dir/nvm.sh"
    log "Installing Node via nvm (.nvmrc or 22)..."
    if [[ -f "$ROOT/.nvmrc" ]]; then
      (cd "$ROOT" && nvm install && nvm use)
    else
      nvm install 22
      nvm use 22
    fi
    return 0
  fi

  # fnm
  if command -v fnm >/dev/null 2>&1; then
    log "Installing Node 22 via fnm..."
    fnm install 22
    fnm use 22
    return 0
  fi

  # n (npm-based version manager)
  if command -v n >/dev/null 2>&1; then
    log "Installing Node 22 via n..."
    sudo n 22 2>/dev/null || n 22
    return 0
  fi

  return 1
}

ensure_node() {
  if node_ok; then
    log "Node $(node -v) meets requirement (>= ${MIN_NODE_MAJOR}.0.0)."
    return 0
  fi

  local current
  current="$(node -v 2>/dev/null || echo 'not installed')"
  err "Node ${current} is below required >= ${MIN_NODE_MAJOR}.0.0."
  err "Wrangler 4.95.0 and its dependencies require Node 22+."

  if [[ "$INSTALL_LOCAL_REEXEC" == "1" ]]; then
    err "Node upgrade was attempted but the active shell still reports an old version."
    err "Open a new terminal, run: nvm use 22  (or fnm use 22), then re-run: npm run setup:local"
    exit 1
  fi

  log "Attempting to upgrade Node using nvm, fnm, or n..."
  if try_upgrade_node && node_ok; then
    export INSTALL_LOCAL_REEXEC=1
    log "Re-running installer with upgraded Node..."
    exec env INSTALL_LOCAL_REEXEC=1 PATH="$PATH" bash "$0" "$@"
  fi

  err "Could not upgrade Node automatically."
  err ""
  err "Install Node 22+ manually, then re-run this script:"
  err "  1. nvm:  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  err "           source ~/.nvm/nvm.sh && nvm install 22 && nvm use 22"
  err "  2. Or:   https://nodejs.org/ (LTS 22.x installer)"
  err ""
  err "This repo includes .nvmrc (22) — run 'nvm use' in the project root after installing nvm."
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
  if npm install; then
    return 0
  fi

  err "npm install failed in $dir."
  err "If you saw ERR_SSL_CIPHER_OPERATION_FAILED:"
  err "  - Retry on a stable network"
  err "  - Update WSL: sudo apt update && sudo apt upgrade"
  err "  - Try: npm config set registry https://registry.npmjs.org/"
  err "  - See log: ls -t ~/.npm/_logs/ | head -1"
  exit 1
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
  log "SINC CRM — local dependency installer"
  log "Project root: $ROOT"

  if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" && -x "$ROOT/node_modules/.bin/supabase" ]]; then
    if node_ok; then
      log "Dependencies already installed; syncing with package.json..."
    fi
  fi

  ensure_node

  # Root: supabase CLI + stack verification tooling
  npm_install_dir "$ROOT" "root (supabase CLI)"

  # Worker: wrangler
  npm_install_dir "$ROOT/worker" "worker (wrangler)"

  log ""
  log "=== Verifying installed CLIs ==="
  verify_binary "$ROOT/worker/node_modules/.bin/wrangler" "wrangler"
  verify_binary "$ROOT/node_modules/.bin/supabase" "supabase"

  log ""
  log "Done. Use project-local CLIs:"
  log "  cd worker && npx wrangler whoami"
  log "  npx supabase --version"
  log "  npm run verify:stack:local"
}

main "$@"
