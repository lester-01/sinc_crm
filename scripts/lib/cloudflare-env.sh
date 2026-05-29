#!/usr/bin/env bash
# Sourceable Cloudflare credentials for deploy scripts.
# Child bash scripts must SOURCE this file — running ensure-cloudflare-auth.sh
# in a subprocess does not export vars to the parent (OAuth trap).
#
# Usage:
#   source "$ROOT/scripts/lib/cloudflare-env.sh"
#   export_cloudflare_env   # sets CLOUDFLARE_API_TOKEN (+ ACCOUNT_ID)

cloudflare_env_root() {
  if [[ -n "${CLOUDFLARE_ENV_ROOT:-}" ]]; then
    printf '%s' "$CLOUDFLARE_ENV_ROOT"
    return
  fi
  # This file lives in scripts/lib/ — repo root is two levels up.
  printf '%s' "$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
}

_cf_parse_dotenv() {
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
      if [[ "$val" =~ ^\"(.*)\"$ ]]; then val="${BASH_REMATCH[1]}"; fi
      if [[ "$val" =~ ^\'(.*)\'$ ]]; then val="${BASH_REMATCH[1]}"; fi
      export "$key=$val"
    fi
  done <"$file"
}

_cf_merge_cloudflare_creds() {
  local root token_saved account_saved
  root="$(cloudflare_env_root)"
  token_saved="${CLOUDFLARE_API_TOKEN:-}"
  account_saved="${CLOUDFLARE_ACCOUNT_ID:-}"
  unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID 2>/dev/null || true
  _cf_parse_dotenv "$root/worker/.cloudflare.env"
  local file_token="${CLOUDFLARE_API_TOKEN:-}"
  local file_account="${CLOUDFLARE_ACCOUNT_ID:-}"
  if [[ -n "$token_saved" ]]; then
    export CLOUDFLARE_API_TOKEN="$token_saved"
  elif [[ -n "$file_token" ]]; then
    export CLOUDFLARE_API_TOKEN="$file_token"
  fi
  if [[ -n "$account_saved" ]]; then
    export CLOUDFLARE_ACCOUNT_ID="$account_saved"
  elif [[ -n "$file_account" ]]; then
    export CLOUDFLARE_ACCOUNT_ID="$file_account"
  fi
}

export_cloudflare_env() {
  _cf_merge_cloudflare_creds
  if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || "${CLOUDFLARE_API_TOKEN}" == *"your-"* ]]; then
    printf 'ERROR: CLOUDFLARE_API_TOKEN not set. Use worker/.cloudflare.env or env.\n' >&2
    return 1
  fi
  if [[ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
    printf 'ERROR: CLOUDFLARE_ACCOUNT_ID not set (required for API URL resolution).\n' >&2
    return 1
  fi
  export CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID
  return 0
}
