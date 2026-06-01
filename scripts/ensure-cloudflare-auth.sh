#!/usr/bin/env bash
# Cloudflare tooling auth ladder:
#   1) wrangler whoami (existing session)
#   2) CLOUDFLARE_API_TOKEN (+ ACCOUNT_ID) from environment
#   3) same keys from root .env (env wins over file)
#   4) wrangler login (desktop OAuth) — skipped when CI=true (fail fast)
#
# Usage: bash scripts/ensure-cloudflare-auth.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"
# shellcheck source=scripts/lib/cloudflare-env.sh
source "$ROOT/scripts/lib/cloudflare-env.sh"

log() { printf '%s\n' "$*"; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

token_configured() {
  [[ -n "${CLOUDFLARE_API_TOKEN:-}" && "${CLOUDFLARE_API_TOKEN}" != *"your-"* ]]
}

wrangler_ready() {
  [[ -x "$WRANGLER_BIN" ]]
}

whoami_ok() {
  local out
  if ! out="$("$WRANGLER_BIN" whoami 2>&1)"; then
    return 1
  fi
  if echo "$out" | grep -qi 'not authenticated'; then
    return 1
  fi
  return 0
}

print_whoami() {
  "$WRANGLER_BIN" whoami 2>/dev/null | head -n 3 || true
}

ci_fail_fast() {
  err "CI=true: headless environment — browser OAuth is not available."
  err "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID in the environment."
  err "See docs/external-auth.md"
  exit 1
}

main() {
  if ! wrangler_ready; then
    err "Wrangler not found. Run: npm run setup:cli"
    exit 1
  fi

  _cf_merge_cloudflare_creds

  if [[ "${CI:-}" == "true" ]]; then
    if ! token_configured; then
      ci_fail_fast
    fi
    log "Cloudflare auth: verifying scoped API token (CI)..."
    if whoami_ok; then
      log "Authenticated with scoped API token."
      print_whoami
      exit 0
    fi
    err "CLOUDFLARE_API_TOKEN is set but wrangler whoami failed."
    err "Check token permissions and CLOUDFLARE_ACCOUNT_ID."
    exit 1
  fi

  if whoami_ok; then
    log "Already authenticated with Cloudflare."
    print_whoami
    exit 0
  fi

  if token_configured; then
    log "Cloudflare auth: verifying scoped API token..."
    if whoami_ok; then
      log "Authenticated with scoped API token."
      print_whoami
      exit 0
    fi
    err "CLOUDFLARE_API_TOKEN is set but wrangler whoami failed."
    err "Check token permissions and CLOUDFLARE_ACCOUNT_ID."
    exit 1
  fi

  log "No API token found. Starting wrangler login (desktop browser may open)..."
  (cd "$ROOT/worker" && "$WRANGLER_BIN" login)

  if whoami_ok; then
    log "Authenticated after wrangler login."
    print_whoami
    exit 0
  fi

  err "Not authenticated. Set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) or complete wrangler login."
  err "See docs/external-auth.md"
  exit 1
}

main "$@"
