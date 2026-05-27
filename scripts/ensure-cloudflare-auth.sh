#!/usr/bin/env bash
# Ensure Wrangler can call the Cloudflare API.
# Auth order: existing OAuth session → scoped API token (worker/.cloudflare.env) → browser login.
#
# Usage:
#   bash scripts/ensure-cloudflare-auth.sh
#   ALLOW_WRANGLER_LOGIN=1 bash scripts/ensure-cloudflare-auth.sh   # allow browser fallback

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

main() {
  if ! wrangler_ready; then
    err "Wrangler not found. Run: npm run setup:local"
    exit 1
  fi

  log "Cloudflare auth: checking existing wrangler session..."
  if whoami_ok; then
    log "Already authenticated (OAuth or environment)."
    print_whoami
    exit 0
  fi

  log "Cloudflare auth: checking scoped API token (worker/.cloudflare.env)..."
  if [[ ! -f "$CLOUDFLARE_ENV" ]]; then
    log "  worker/.cloudflare.env not found — skip token auth"
  else
    load_cloudflare_token_env
    if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || "${CLOUDFLARE_API_TOKEN}" == *"your-"* ]]; then
      log "  CLOUDFLARE_API_TOKEN not set in worker/.cloudflare.env"
    else
      export CLOUDFLARE_API_TOKEN
      [[ -n "${CLOUDFLARE_ACCOUNT_ID:-}" ]] && export CLOUDFLARE_ACCOUNT_ID
      if whoami_ok; then
        log "Authenticated with scoped API token."
        print_whoami
        exit 0
      fi
      err "CLOUDFLARE_API_TOKEN is set but wrangler whoami failed."
      err "Check token permissions and CLOUDFLARE_ACCOUNT_ID in worker/.cloudflare.env"
      exit 1
    fi
  fi

  if [[ "$ALLOW_WRANGLER_LOGIN" != "1" ]]; then
    err "Not authenticated. Options:"
    err "  1. Add a scoped API token to worker/.cloudflare.env (recommended)"
    err "  2. Run: ALLOW_WRANGLER_LOGIN=1 npm run setup:cloud"
    exit 1
  fi

  warn "Browser OAuth is a fallback. A scoped API token in worker/.cloudflare.env is better for repeatability."
  warn "See docs/quick-start.md — Cloudflare API token (scoped)."
  log "Starting wrangler login (browser may open; complete login in the browser)..."
  (cd "$ROOT/worker" && "$WRANGLER_BIN" login)

  if whoami_ok; then
    log "Authenticated after wrangler login."
    print_whoami
    exit 0
  fi

  err "wrangler login finished but whoami still failed."
  exit 1
}

main "$@"
