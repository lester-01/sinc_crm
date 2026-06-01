#!/usr/bin/env bash
# Install frontend (Vite + React) dependencies at repo root.
# Requires scaffold files (src/main.tsx, vite.config.ts). Safe to re-run.
#
# Usage: npm run setup:frontend

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIN_NODE_MAJOR=22

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

node_major() {
  command -v node >/dev/null 2>&1 || { echo 0; return; }
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

scaffold_present() {
  [[ -f "$ROOT/vite.config.ts" && -f "$ROOT/src/main.tsx" && -f "$ROOT/src/app/router.tsx" ]]
}

already_installed() {
  [[ -d "$ROOT/node_modules/react" && -d "$ROOT/node_modules/vite" ]]
}

main() {
  log "=== Frontend dependencies installer ==="
  log "Repository root: $ROOT"
  log ""

  local major
  major="$(node_major)"
  if [[ -z "$major" || "$major" -lt "$MIN_NODE_MAJOR" ]]; then
    err "Node $(node -v 2>/dev/null || echo missing) is below ${MIN_NODE_MAJOR}."
    err "Run: nvm use 22"
    exit 1
  fi
  log "Node $(node -v) OK"

  if ! scaffold_present; then
    err "Frontend scaffold missing (expected src/main.tsx, vite.config.ts)."
    err "Pull latest commits or scaffold per project_requirements/architecture.md"
    exit 1
  fi

  if already_installed; then
    log "Dependencies present; syncing with package.json..."
  else
    log "Installing dependencies..."
  fi

  cd "$ROOT"
  npm install

  log ""
  log "Checking frontend packages..."
  npm ls react react-dom vite react-router-dom @tanstack/react-query @supabase/supabase-js --depth=0 >/dev/null 2>&1 || {
    err "Some frontend dependencies are missing."
    exit 1
  }
  log "  OK: react, vite, react-router-dom, @tanstack/react-query, @supabase/supabase-js"

  log ""
  log "Running TypeScript check..."
  npm run typecheck

  log ""
  log "Frontend dependencies ready."
  log "  npm run dev          — Vite on http://localhost:5173"
  log "  npm run verify:scaffold"
}

main "$@"
