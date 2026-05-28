#!/usr/bin/env bash
# Install Playwright Chromium system dependencies (Linux). OS-aware.
#
# Requires root: sudo npm run playwright:install-deps
# Debian 13 (trixie) verified; other distros use Playwright defaults where possible.
#
# Usage:
#   sudo bash scripts/install-playwright-deps.sh
#   sudo bash scripts/install-playwright-deps.sh --dry-run

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

if [[ "$(uname -s)" != "Linux" ]]; then
  err "System dependency install is Linux-only."
  err "On macOS, run: npm run playwright:install"
  err "On Windows, use WSL and run this script inside WSL."
  exit 1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  err "This step needs root. Run:"
  err "  sudo npm run playwright:install-deps"
  exit 1
fi

read_os() {
  ID=""
  VERSION_ID=""
  VERSION_CODENAME=""
  if [[ -f /etc/os-release ]]; then
    # shellcheck disable=SC1091
    . /etc/os-release
  fi
}

read_os

log "=== Playwright system deps (Chromium only) ==="
log "Detected: ${PRETTY_NAME:-Linux ${ID:-unknown}}"
log ""

install_via_playwright() {
  local platform="$1"
  log "Using Playwright install-deps for: ${platform}"
  export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE="${platform}"
  if [[ "$DRY_RUN" == "1" ]]; then
    log "[dry-run] PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=${platform} npx playwright install-deps chromium"
    return 0
  fi
  cd "$ROOT"
  unset PLAYWRIGHT_BROWSERS_PATH
  npx playwright install-deps chromium
}

install_debian_apt_list() {
  if [[ "$DRY_RUN" == "1" ]]; then
    bash "$ROOT/scripts/install-playwright-deps-debian.sh" --dry-run
  else
    bash "$ROOT/scripts/install-playwright-deps-debian.sh"
  fi
}

case "${ID:-}" in
  debian)
    case "${VERSION_ID:-}" in
      13)
        log "Debian 13 (trixie): Playwright 1.52 has no native debian13 map — using repo apt list (debian12 set)."
        log "Verified on Debian trixie; other distros may need manual tweaks."
        log ""
        install_debian_apt_list
        ;;
      12)
        install_via_playwright "debian12-x64"
        ;;
      11)
        install_via_playwright "debian11-x64"
        ;;
      *)
        log "Unknown Debian VERSION_ID=${VERSION_ID:-?}; trying debian12-x64 override."
        install_via_playwright "debian12-x64"
        ;;
    esac
    ;;
  ubuntu)
    log "Ubuntu ${VERSION_ID:-}: using Playwright's native install-deps (chromium only)."
    if [[ "$DRY_RUN" == "1" ]]; then
      log "[dry-run] npx playwright install-deps chromium"
    else
      cd "$ROOT"
      unset PLAYWRIGHT_BROWSERS_PATH
      npx playwright install-deps chromium
    fi
    ;;
  *)
    log "Unsupported or unknown distro ID=${ID:-?}."
    log "Attempting Playwright default (chromium only) — may fail on bleeding-edge releases."
    log ""
    if [[ "$DRY_RUN" == "1" ]]; then
      log "[dry-run] npx playwright install-deps chromium"
    else
      cd "$ROOT"
      unset PLAYWRIGHT_BROWSERS_PATH
      npx playwright install-deps chromium || {
        err "install-deps failed. Try Debian/Ubuntu workaround in docs/playwright-wsl-setup.md"
        exit 1
      }
    fi
    ;;
esac

log ""
log "Done. Next: npm run verify:playwright"
