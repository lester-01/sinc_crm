# Cloudflare authentication

## Required: scoped API token

Wrangler and CI use **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** in `worker/.cloudflare.env` (see [quick-start.md](./quick-start.md)).

The Worker runs on **headless servers** — browser login is not a supported path for this project going forward.

## Deprecated: OAuth / `wrangler login` (next release removal)

`scripts/ensure-cloudflare-auth.sh` still contains a **browser OAuth fallback** when `ALLOW_WRANGLER_LOGIN=1`. That path is:

- **Deprecated** — not tested in Phase 4 verification
- **Scheduled for removal** in the next release

Do not rely on `wrangler login` for setup or deploy.

---

## Maintainer note — when removing OAuth

When deleting the OAuth branch from `ensure-cloudflare-auth.sh` and `setup-cloud.sh`:

1. **Fail fast** if `worker/.cloudflare.env` is missing.
2. **Fail fast** if `CLOUDFLARE_API_TOKEN` is unset or still a placeholder.
3. Load token (+ account ID), run `wrangler whoami`, exit non-zero on failure — no silent fallback.
4. Remove `ALLOW_WRANGLER_LOGIN` and all `wrangler login` calls.
5. Update `verify-stack-setup.mjs` `verifyCloudflare()` to match (token-only; no session/OAuth check).
6. Remove OAuth mentions from `docs/quick-start.md` and this file’s deprecated section.

Reference implementation after removal: require token block at the top of `ensure-cloudflare-auth.sh` `main()` (see comments tagged `MAINTAINER: token-only`).
