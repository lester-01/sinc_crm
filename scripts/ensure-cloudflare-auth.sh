#!/usr/bin/env bash
# Ensure Wrangler can call the Cloudflare API via scoped API token (worker/.cloudflare.env).
#
# Supported: CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) → wrangler whoami
#
# Deprecated (next release removal): ALLOW_WRANGLER_LOGIN=1 → wrangler login (browser OAuth).
#   Not tested in Phase 4 verify. Backend/CI is headless — use token only.
#
# MAINTAINER: token-only — When removing OAuth, fail fast if worker/.cloudflare.env or
#   CLOUDFLARE_API_TOKEN is missing; do not fall back to wrangler login.
#
# Usage:
#   bash scripts/ensure-cloudflare-auth.sh

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WRANGLER_BIN="$ROOT/worker/node_modules/.bin/wrangler"
CLOUDFLARE_ENV="$ROOT/worker/.cloudflare.env"
ALLOW_WRANGLER_LOGIN="${ALLOW_WRANGLER_LOGIN:-0}"

log() { printf '%s\n' "$*"; }
warn() { printf 'WARNING: %s\n' "$*" >&2; }
err() { printf 'ERROR: %s\n' "$*" >&2; }

parse_dotenv_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -z "$line" ]] && continue
    if [[ "$line" =~ ^([A-Za-z_][A-Za-z0-9_]*)=(.*)$ ]]; then
      local key="${BASH_REMATCH[1]}"
      local val="${BASH_REMATCH[2]}"
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then
        val="${BASH_REMATCH[1]}"
      elif [[ "$val" =~ ^\'(.*)\'$ ]]; then
        val="${BASH_REMATCH[1]}"
      fi
      export "$key=$val"
    fi
  done <"$file"
}

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

load_cloudflare_token_env() {
  unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID 2>/dev/null || true
  parse_dotenv_file "$CLOUDFLARE_ENV"
}

# MAINTAINER: token-only — start here after OAuth removal; require file + token before whoami.
require_cloudflare_token_file() {
  if [[ ! -f "$CLOUDFLARE_ENV" ]]; then
    err "Missing worker/.cloudflare.env"
    err "Copy worker/.cloudflare.env.example and set CLOUDFLARE_API_TOKEN."
    err "See docs/quick-start.md and docs/cloudflare-auth.md"
    exit 1
  fi
  load_cloudflare_token_env
  if ! token_configured; then
    err "CLOUDFLARE_API_TOKEN is required in worker/.cloudflare.env"
    err "Create a scoped token in the Cloudflare dashboard (see docs/quick-start.md)."
    exit 1
  fi
  export CLOUDFLARE_API_TOKEN
  [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] && export CLOUDFLARE_ACCOUNT_ID
}

main() {
  if ! wrangler_ready; then
    err "Wrangler not found. Run: npm run setup:local"
    exit 1
  fi

  require_cloudflare_token_file

  log "Cloudflare auth: verifying scoped API token (worker/.cloudflare.env)..."
  if whoami_ok; then
    log "Authenticated with scoped API token."
    print_whoami
    exit 0
  fi

  err "CLOUDFLARE_API_TOKEN is set but wrangler whoami failed."
  err "Check token permissions and CLOUDFLARE_ACCOUNT_ID in worker/.cloudflare.env"

  # --- Deprecated OAuth fallback (removal planned; not tested in verify:stack:cloud) ---
  if [[ "$ALLOW_WRANGLER_LOGIN" != "1" ]]; then
    err "Browser OAuth is deprecated. See docs/cloudflare-auth.md"
    exit 1
  fi

  warn "DEPRECATED: wrangler login (browser OAuth) — untested fallback; removed next release."
  warn "Use CLOUDFLARE_API_TOKEN in worker/.cloudflare.env for headless/CI."
  log "Starting wrangler login (browser may open)..."
  (cd "$ROOT/worker" && "$WRANGLER_BIN" login)

  if whoami_ok; then
    log "Authenticated after wrangler login (deprecated path)."
    print_whoami
    exit 0
  fi

  err "wrangler login finished but whoami still failed."
  exit 1
}

main "$@"
