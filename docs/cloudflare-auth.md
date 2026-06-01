[← Back to README — Documentation](../README.md#documentation)

# Cloudflare authentication

## Recommended: scoped API token

For local scripts, verification, and CI/CD, use **`CLOUDFLARE_API_TOKEN`** and **`CLOUDFLARE_ACCOUNT_ID`** in `worker/.cloudflare.env` or exported in the environment (env wins over file). Auth ladder: [external-auth.md](./external-auth.md). Setup: [quick-start.md](./quick-start.md).

`scripts/ensure-cloudflare-auth.sh` and `npm run verify:cloudflare` use this token path by default.

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

**Pages project name vs URL:** deploy uses project name `sinc-crm` (from `worker/wrangler.toml`: `sinc-crm-api` → `sinc-crm`). The browser URL may differ (e.g. `https://sinc-crm-esg.pages.dev`) — that comes from the API **subdomain** field. See [deploy-guide.md](./deploy-guide.md#pages-url-stable-vs-deployment-preview-read-before-pass-2).

Desktop **OAuth** (`wrangler login`) can work for Wrangler CLI alone, but **`deploy:all` requires a token with the permissions above** in `worker/.cloudflare.env` (or env) so URL resolution does not depend on OAuth.

## Optional: desktop OAuth (`wrangler login`)

On a **desktop** machine without a token, `ensure-cloudflare-auth.sh` can run **`wrangler login`** after the token ladder fails. This is useful for quick local experiments; it is **not** used in `verify:cloudflare` and is **not** available when `CI=true` (fail fast — set env vars instead).

## CI / headless

When `CI=true`, scripts **do not** open a browser. Export `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Full ladder: [external-auth.md](./external-auth.md).

## Production deploy

`npm run deploy:worker` and `deploy:pages` use the same token ladder via `ensure-cloudflare-auth.sh`.

- **Today:** manual CLI deploy — [deploy-guide.md](./deploy-guide.md) (two-pass: Worker → Pages → CORS + Supabase Auth URLs).
- **Later:** GitHub push → Cloudflare Pages and/or GitHub Actions for Worker — valid alternative, not checked into this repo yet; both paths will be documented.
