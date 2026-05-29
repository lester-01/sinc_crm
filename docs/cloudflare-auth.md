[← Back to README — Documentation](../README.md#documentation)

# Cloudflare authentication

## Recommended: scoped API token

For local scripts, verification, and CI/CD, use **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** in `worker/.cloudflare.env` or exported in the environment (env wins over file). See [quick-start.md](./quick-start.md) and [external-auth.md](./external-auth.md).

`scripts/ensure-cloudflare-auth.sh` and `npm run verify:stack:cloudflare` use this token path by default.

## Scoped token permissions (required for deploy)

`npm run deploy:all` and `deploy:pages` resolve **Worker** and **Pages** URLs via the **Cloudflare REST API** (not local files or deploy stdout). If the token lacks permissions, deploy fails with an **ALERT** and `Authentication error` (code `10000`).

Create a **custom token** ([My Profile → API Tokens](https://dash.cloudflare.com/profile/api-tokens)) with at least:

| Permission | Access | Why |
|------------|--------|-----|
| Account → Account Settings | Read | Account context / `CLOUDFLARE_ACCOUNT_ID` |
| Account → Workers Scripts | Edit | `wrangler deploy` (Worker API) |
| Account → **Cloudflare Pages** | **Read** | `GET /accounts/…/pages/projects` — stable `pages.dev` hostname |
| Account → **Cloudflare Pages** | **Edit** | `wrangler pages deploy` / project create |

### Optional User permissions (not required for deploy)

Wrangler may print warnings during `wrangler whoami` even when deploy succeeds:

```txt
Unable to retrieve email for this user. Are you missing the User->User Details->Read permission?
Unable to get membership roles. Are you missing the User->Memberships->Read permission?
```

| Permission | Required? | Why add it |
|------------|-----------|------------|
| **User → User Details → Read** | **No** | Lets Wrangler show your account email in `whoami` output. Deploy, Workers, and Pages API calls do **not** need this. |
| **User → Memberships → Read** | **No** | Quieter `whoami` when listing org membership. Not needed for `deploy:all`. |

You can ignore these warnings if `whoami` still shows your **Account Name** and **Account ID**. Add the two User permissions only if you want a clean `whoami` line with no warnings.

**Pages project name vs URL:** deploy uses project name `sinc-crm` (from `worker/wrangler.toml`: `sinc-crm-api` → `sinc-crm`). The browser URL may be different (e.g. `https://sinc-crm-esg.pages.dev`) — that comes from the API **subdomain** field, not from guessing `sinc-crm.pages.dev`. See [pages-naming-investigation.md](./pages-naming-investigation.md).

Desktop **OAuth** (`wrangler login`) can work for Wrangler CLI alone, but **`deploy:all` requires a token with the permissions above** in `worker/.cloudflare.env` (or env) so URL resolution does not depend on OAuth.

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

## Production deploy

`npm run deploy:worker` and `deploy:pages` use the same token ladder via `ensure-cloudflare-auth.sh`.

- **Today:** manual CLI deploy — [deploy-guide.md](./deploy-guide.md) (two-pass: Worker → Pages → CORS + Supabase Auth URLs).
- **Later:** GitHub push → Cloudflare Pages and/or GitHub Actions for Worker — valid alternative, not checked into this repo yet; both paths will be documented.
