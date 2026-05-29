[← Back to README — Documentation](../README.md#documentation)

# Cloudflare authentication

## Recommended: scoped API token

For local scripts, verification, and CI/CD, use **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** in `worker/.cloudflare.env` or exported in the environment (env wins over file). See [quick-start.md](./quick-start.md) and [external-auth.md](./external-auth.md).

`scripts/ensure-cloudflare-auth.sh` and `npm run verify:stack:cloudflare` use this token path by default.

## Optional: desktop OAuth (`wrangler login`)

On a **desktop** machine without a token, `ensure-cloudflare-auth.sh` can run **`wrangler login`** after the token ladder fails. This is useful for quick local experiments; it is **not** used in `verify:stack:cloudflare` and is **not** available when `CI=true` (fail fast — set env vars instead).

## CI / headless

When `CI=true`, scripts **do not** open a browser. Export:

```bash
CLOUDFLARE_API_TOKEN=...
CLOUDFLARE_ACCOUNT_ID=...
```

## Auth order (script)

1. `wrangler whoami` — already logged in
2. Token from `process.env`
3. Token from `worker/.cloudflare.env` (env overrides file)
4. `wrangler login` — only if not `CI=true` and no valid token
