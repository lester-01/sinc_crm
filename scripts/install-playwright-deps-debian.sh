#!/usr/bin/env bash
# Install Playwright **Chromium-only** OS packages on Debian (incl. Trixie 13).
#
# Why: Playwright 1.52 maps Debian 13 → ubuntu20.04 fallback (wrong package names).
#      Running `install-deps` without "chromium" also pulls WebKit/FFmpeg deps that fail on Trixie.
#
# Usage (from repo root):
#   bash scripts/install-playwright-deps-debian.sh
#   bash scripts/install-playwright-deps-debian.sh --dry-run
#
# Or use Playwright directly after override:
#   export PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=debian12-x64
#   sudo -E npx playwright install-deps chromium

set -euo pipefail

DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Run with sudo: sudo bash scripts/install-playwright-deps-debian.sh"
  exit 1
fi

echo "=== Playwright Chromium deps for Debian (debian12-x64 package set) ==="
echo ""

# Optional: fix trixie-backports index noise (does not block main repo)
if grep -rq trixie-backports /etc/apt/sources.list /etc/apt/sources.list.d 2>/dev/null; then
  echo "Note: If apt update shows trixie-backports diff/Index errors, disable that source or run:"
  echo "  sudo apt update -o Acquire::Retries=3"
  echo ""
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update

# Debian 12 chromium list from Playwright nativeDeps (apt resolves t64 names on Trixie)
PACKAGES=(
  fonts-noto-color-emoji
  fonts-unifont
  fonts-liberation
  fonts-freefont-ttf
  libfontconfig1
  libfreetype6
  xfonts-scalable
  libasound2
  libatk-bridge2.0-0
  libatk1.0-0
  libatspi2.0-0
  libcairo2
  libcups2
  libdbus-1-3
  libdrm2
  libgbm1
  libglib2.0-0
  libnspr4
  libnss3
  libpango-1.0-0
  libx11-6
  libxcb1
  libxcomposite1
  libxdamage1
  libxext6
  libxfixes3
  libxkbcommon0
  libxrandr2
)

if [[ "$DRY_RUN" == "1" ]]; then
  echo "Would install: ${PACKAGES[*]}"
  exit 0
fi

apt-get install -y --no-install-recommends "${PACKAGES[@]}"

echo ""
echo "Done. Verify with:"
echo "  npm run verify:playwright"
echo "  npm run test:e2e:dev -- --grep @phase6"
