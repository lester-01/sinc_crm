#!/usr/bin/env bash
# Install nvm (if needed) and ensure Node 22+ is active for this shell.
#
# Usage: npm run setup:node
#        bash scripts/setup-node.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh"
MIN_NODE_MAJOR=22
SHELL_CONFIG_CHANGED=0

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

prepare_nvm_environment() {
  if [[ -n "${npm_config_prefix:-}" || -n "${NPM_CONFIG_PREFIX:-}" ]]; then
    log "Unsetting npm_config_prefix (incompatible with nvm; was: ${npm_config_prefix:-${NPM_CONFIG_PREFIX}})"
    unset npm_config_prefix NPM_CONFIG_PREFIX
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

print_terminal_notice() {
  local config
  config="$(shell_config_file)"
  log ""
  log "================================================================"
  log "IMPORTANT: Restart your terminal (or reload shell config)"
  log "================================================================"
  log "This script updated nvm and/or your shell startup file."
  log ""
  if [[ -n "$config" ]]; then
    log "  Option A (quick):  source $config"
    log "  Option B (best):   close this terminal, open a new one, then:"
  else
    log "  Close this terminal, open a new one, then:"
  fi
  log "                     cd \"$ROOT\""
  log "                     npm run verify:node"
  log "================================================================"
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
    sed -i '/NVM_DIR/i # System npm prefix breaks nvm (added by SINC CRM setup-node.sh)\nunset npm_config_prefix NPM_CONFIG_PREFIX 2>/dev/null || true' "$config" 2>/dev/null || {
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

# NVM (Node Version Manager) — added by SINC CRM setup-node.sh
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
    err "curl is required to install nvm. Run: npm run verify:linux"
    exit 1
  fi

  log "NVM not found. Installing nvm (official installer)..."
  SHELL_CONFIG_CHANGED=1
  prepare_nvm_environment
  set +e
  curl -fsSL "$NVM_INSTALL_URL" | bash
  local nvm_install_status=$?
  set -e

  if [[ ! -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    err "NVM installation failed (curl|bash exit ${nvm_install_status})."
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
    err "Failed to load nvm. Run: unset npm_config_prefix && npm run setup:node"
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

ensure_node_22() {
  cd "$ROOT"

  log "Ensuring Node ${MIN_NODE_MAJOR}+ via nvm..."
  set +e
  if [[ -f .nvmrc ]]; then
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

main() {
  log "SINC CRM — setup:node (nvm + Node ${MIN_NODE_MAJOR}+)"
  log "Repository: $ROOT"
  log ""

  prepare_nvm_environment

  if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
    load_nvm
    hash -r 2>/dev/null || true
    local major
    major="$(node_major)"
    if [[ -n "$major" && "$major" -ge "$MIN_NODE_MAJOR" ]]; then
      log "Node $(node -v) already meets requirement."
      require_npm
      exit 0
    fi
  fi

  install_nvm_if_missing
  ensure_nvm_init_in_shell_config
  load_nvm
  ensure_node_22
  require_npm

  log ""
  log "setup:node complete."
  if [[ "$SHELL_CONFIG_CHANGED" == "1" ]]; then
    print_terminal_notice
  fi
}

main "$@"
