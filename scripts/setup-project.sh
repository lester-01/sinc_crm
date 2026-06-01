#!/usr/bin/env bash
# Master setup — runs cli + worker + frontend installers in order.
#
# Usage: npm run setup:project
#        SETUP_PROJECT_PHASES=cli,worker bash scripts/setup-project.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PHASES="${SETUP_PROJECT_PHASES:-cli,worker,frontend}"

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
  log "SINC CRM — setup:project"
  log "Repository: $ROOT"
  log "Phases: $PHASES"
  log "=========================================="

  if phase_enabled "cli"; then
    if [[ -x "$ROOT/worker/node_modules/.bin/wrangler" && -x "$ROOT/node_modules/.bin/supabase" ]]; then
      step "Phase: cli (skipped — CLIs already installed)"
      npm run verify:cli || true
    else
      run_phase "cli — wrangler + supabase CLI" bash "$ROOT/scripts/setup-cli.sh"
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
  log "setup:project finished."
  log "  npm run verify:scaffold  — backend/frontend structure"
  log "  npm run setup:supabase   — after .env"
  log "  docs/stack-setup.md"
  log "=========================================="
}

main "$@"
