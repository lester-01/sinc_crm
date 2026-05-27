#!/usr/bin/env bash
# Post-clone installer for Linux and WSL only.
# Installs Node 22 via nvm, project-local CLIs (wrangler, supabase), and runs stack checks.
#
# Usage (from anywhere):
#   bash /path/to/repo/scripts/install.sh
#
# Or from repo root:
#   npm run install:linux
#
# Safe to re-run: skips steps that are already complete.
# Windows (without WSL): not supported — see docs/quick-start.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"
MIN_NODE_MAJOR=22
SKIP_VERIFY="${SKIP_VERIFY:-0}"
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"
SUPABASE_BIN="$ROOT/node_modules/.bin/supabase"
# Set to 1 when nvm or shell config was changed (user should restart terminal or source rc file).
SHELL_CONFIG_CHANGED=0

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

prepare_nvm_environment() {
  # System/apt npm often sets this; nvm refuses to load while it is set.
  if [[ -n "${npm_config_prefix:-}" || -n "${NPM_CONFIG_PREFIX:-}" ]]; then
    log "Unsetting npm_config_prefix (incompatible with nvm; was: ${npm_config_prefix:-${NPM_CONFIG_PREFIX}})"
    unset npm_config_prefix NPM_CONFIG_PREFIX
  fi
}

print_terminal_notice() {
  local config
  config="$(shell_config_file)"
  log ""
  log "================================================================"
  log "IMPORTANT: Restart your terminal (or reload shell config)"
  log "================================================================"
  log "This installer updated nvm and/or your shell startup file."
  log "Already-open terminals do NOT pick up those changes automatically."
  log ""
  if [[ -n "$config" ]]; then
    log "  Option A (quick):  source $config"
    log "  Option B (best):   close this terminal, open a new one, then:"
  else
    log "  Close this terminal, open a new one, then:"
  fi
  log "                     cd \"$ROOT\""
  log "                     npm run verify:stack:local"
  log ""
  log "If you see: nvm is not compatible with npm_config_prefix"
  log "  Run:  unset npm_config_prefix"
  log "  Or:   source $config   (after restart, new terminals should use nvm Node 22)"
  log "================================================================"
}

require_linux() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    err "This installer only supports Linux and WSL."
    err "On Windows, use WSL or follow the manual steps in docs/quick-start.md"
    exit 1
  fi
  if grep -qi microsoft /proc/version 2>/dev/null; then
    log "WSL detected."
  else
    log "Linux detected."
  fi
}

shell_config_file() {
  local shell_name
  shell_name="$(basename "${SHELL:-bash}")"
  case "$shell_name" in
    bash) echo "$HOME/.bashrc" ;;
    zsh) echo "$HOME/.zshrc" ;;
    *) echo "" ;;
  esac
}

ensure_nvm_prefix_unset_in_shell_config() {
  local config
  config="$(shell_config_file)"
  [[ -n "$config" ]] || return 0
  [[ -f "$config" ]] || return 0
  if grep -q 'unset npm_config_prefix' "$config" 2>/dev/null; then
    return 0
  fi
  if grep -q 'NVM_DIR' "$config" 2>/dev/null; then
    log "Adding npm_config_prefix unset before nvm in $config"
    SHELL_CONFIG_CHANGED=1
    # shellcheck disable=SC2016
    sed -i '/NVM_DIR/i # System npm prefix breaks nvm (added by SINC CRM install.sh)\nunset npm_config_prefix NPM_CONFIG_PREFIX 2>/dev/null || true' "$config" 2>/dev/null || {
      log "Could not auto-edit $config — if nvm fails, run: unset npm_config_prefix"
    }
  fi
}

ensure_nvm_init_in_shell_config() {
  local config
  config="$(shell_config_file)"
  if [[ -z "$config" ]]; then
    log "Shell is not bash/zsh — skipping automatic NVM lines in shell config."
    return 0
  fi

  [[ -f "$config" ]] || touch "$config"

  if grep -q 'NVM_DIR' "$config" 2>/dev/null; then
    log "NVM already configured in $config"
    ensure_nvm_prefix_unset_in_shell_config
    return 0
  fi

  log "Adding NVM initialization to $config"
  SHELL_CONFIG_CHANGED=1
  cat >>"$config" <<'EOF'

# NVM (Node Version Manager) — added by SINC CRM install.sh
# System npm prefix breaks nvm; clear before loading nvm.
unset npm_config_prefix NPM_CONFIG_PREFIX 2>/dev/null || true
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF
}

install_nvm_if_missing() {
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    log "NVM already installed at ${NVM_DIR:-$HOME/.nvm}"
    return 0
  fi

  if ! command -v curl >/dev/null 2>&1; then
    err "curl is required to install nvm."
    exit 1
  fi

  log "NVM not found. Installing nvm (official installer)..."
  SHELL_CONFIG_CHANGED=1
  prepare_nvm_environment
  # Official installer updates shell config; do not fail the whole script on its exit code.
  set +e
  curl -fsSL "$NVM_INSTALL_URL" | bash
  local nvm_install_status=$?
  set -e

  if [[ ! -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    err "NVM installation failed (curl|bash exit ${nvm_install_status})."
    err "Try manually: curl -o- $NVM_INSTALL_URL | bash"
    exit 1
  fi

  log "NVM installed successfully."
}

load_nvm() {
  prepare_nvm_environment
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [[ ! -s "$NVM_DIR/nvm.sh" ]]; then
    err "NVM is not available at $NVM_DIR/nvm.sh"
    exit 1
  fi
  set +e
  # shellcheck source=/dev/null
  source "$NVM_DIR/nvm.sh"
  local source_status=$?
  set -e
  if [[ "$source_status" -ne 0 ]] || ! type nvm >/dev/null 2>&1; then
    err "Failed to load nvm."
    err "If the message mentions npm_config_prefix, run:  unset npm_config_prefix"
    err "Then open a new terminal (or: source $(shell_config_file || echo ~/.bashrc)) and re-run: npm run install:linux"
    exit 1
  fi
}

node_major() {
  if ! command -v node >/dev/null 2>&1; then
    echo 0
    return
  fi
  node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1
}

already_fully_installed() {
  local major
  major="$(node_major)"
  [[ -n "$major" && "$major" -ge "$MIN_NODE_MAJOR" ]] \
    && [[ -x "$WRANGLER_BIN" ]] \
    && [[ -x "$SUPABASE_BIN" ]]
}

ensure_node_22() {
  cd "$ROOT"

  log "Ensuring Node ${MIN_NODE_MAJOR}+ via nvm..."
  # nvm sometimes returns non-zero under set -e during resolution; handle explicitly.
  set +e
  if [[ -f .nvmrc ]]; then
    log "Using .nvmrc ($(tr -d '[:space:]' < .nvmrc))..."
    nvm install
    local install_status=$?
    nvm use
  else
    nvm install "$MIN_NODE_MAJOR"
    install_status=$?
    nvm use "$MIN_NODE_MAJOR"
  fi
  set -e

  hash -r 2>/dev/null || true

  local major
  major="$(node_major)"
  if [[ -z "$major" || "$major" -lt "$MIN_NODE_MAJOR" ]]; then
    err "Node $(node -v 2>/dev/null || echo 'not available') is still below ${MIN_NODE_MAJOR}."
    if [[ "${install_status:-1}" -ne 0 ]]; then
      err "nvm install failed (exit ${install_status}). Check network and retry:"
      err "  source ~/.nvm/nvm.sh && cd \"$ROOT\" && nvm install 22 && nvm use 22"
    fi
    exit 1
  fi

  log "Node $(node -v) is active."
}

require_npm() {
  command -v npm >/dev/null 2>&1 || {
    err "npm not found after Node install."
    exit 1
  }
  log "npm $(npm -v)"
}

run_project_setup() {
  cd "$ROOT"
  log ""
  log "=== Installing project dependencies ==="
  bash "$ROOT/scripts/install-local-deps.sh"

  if [[ "$SKIP_VERIFY" == "1" ]]; then
    log "Skipping verify:stack:local (SKIP_VERIFY=1)."
    return 0
  fi

  log ""
  log "=== Running stack verification (local phase) ==="
  npm run verify:stack:local
}

main() {
  log "SINC CRM — Linux/WSL installer"
  log "Repository: $ROOT"
  log ""

  require_linux
  prepare_nvm_environment

  # Load nvm early when already present (for idempotent skip check).
  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    load_nvm
    hash -r 2>/dev/null || true
    if already_fully_installed; then
      log "Already set up: Node $(node -v), wrangler, and supabase are installed."
      log "Re-run skipped. To force reinstall: rm -rf node_modules worker/node_modules && npm run install:linux"
      if [[ "$SKIP_VERIFY" != "1" ]]; then
        log ""
        log "=== Running stack verification (local phase) ==="
        npm run verify:stack:local
      fi
      log ""
      log "Nothing else to do for local install."
      if [[ "$SHELL_CONFIG_CHANGED" == "1" ]]; then
        print_terminal_notice
      fi
      exit 0
    fi
  fi

  # Install nvm first; official installer may update shell config itself.
  install_nvm_if_missing
  ensure_nvm_init_in_shell_config
  load_nvm
  ensure_node_22
  require_npm
  run_project_setup

  log ""
  log "Install complete."
  log "Next steps:"
  log "  1. Continue stack setup: docs/stack-setup.md (Phase 2 — cloud accounts)"
  log "  2. Cloudflare token:  worker/.cloudflare.env (see docs/quick-start.md)"
  log "  3. Supabase login:    npx supabase login"
  print_terminal_notice
}

main "$@"
