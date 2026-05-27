#!/usr/bin/env bash
# Master installer — runs phase installers in order with progress output.
# Linux/WSL: use after clone. Skips steps that are already satisfied where possible.
#
# Usage: npm run install:project
#        INSTALL_PROJECT_PHASES=local,worker bash scripts/install-project.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASES="${INSTALL_PROJECT_PHASES:-local,worker,frontend}"

log() { printf '\n%s\n' "$*"; }
step() { printf '>>> %s\n' "$*"; }

run_phase() {
  local name="$1"
  shift
  step "Phase: $name"
  "$@"
  printf '<<< Done: %s\n' "$name"
}

phase_enabled() {
  local key="$1"
  [[ ",${PHASES}," == *",${key},"* ]]
}

scaffold_present_frontend() {
  [[ -f "$ROOT/vite.config.ts" && -f "$ROOT/src/main.tsx" ]]
}

main() {
  log "=========================================="
  log "SINC CRM — master project installer"
  log "Repository: $ROOT"
  log "Phases: $PHASES"
  log "=========================================="

  if phase_enabled "local"; then
    if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" && -x "$ROOT/node_modules/.bin/supabase" ]]; then
      step "Phase: local (skipped — CLIs already installed)"
      npm run verify:stack:local || true
    else
      run_phase "local — Node 22, wrangler, supabase CLI" bash "$ROOT/scripts/install-local-deps.sh"
    fi
  fi

  if phase_enabled "worker"; then
    run_phase "worker — Hono, Supabase, jose, zod" bash "$ROOT/scripts/install-worker-deps.sh"
  fi

  if phase_enabled "frontend"; then
    if scaffold_present_frontend; then
      if [[ -d "$ROOT/node_modules/react" ]]; then
        step "Phase: frontend (skipped — deps installed; running typecheck)"
        (cd "$ROOT" && npm run typecheck) || true
      else
        run_phase "frontend — Vite, React, shadcn" bash "$ROOT/scripts/install-frontend-deps.sh"
      fi
    else
      step "Phase: frontend (skipped — scaffold not in repo yet)"
    fi
  fi

  log "=========================================="
  log "Master installer finished."
  log "  npm run verify:stack:scaffold  — backend/frontend structure"
  log "  npm run setup:cloud            — Phase 4 (after env files + keys)"
  log "  docs/stack-setup.md            — phase checklist"
  log "=========================================="
}

main "$@"
