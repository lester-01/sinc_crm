[← Back to README — Deployment](../README.md#deployment)

# Deployment guide (Phase 14)

Deploy the **Cloudflare Worker API** and **Cloudflare Pages** frontend against your **production Supabase** project.

| Component | Host | Config |
|-----------|------|--------|
| Frontend (Vite SPA) | Cloudflare Pages | `.env.production` (build-time) |
| API (Hono) | Cloudflare Workers | Wrangler secrets (runtime) |
| Database + Auth | Supabase | Same project keys; Auth URL settings |

Related: [external-auth.md](./external-auth.md) · [cloudflare-auth.md](./cloudflare-auth.md) · [database-setup.md](./database-setup.md)

---

## Prerequisites

- Phases 1–5 complete on the **production** Supabase project (`npm run db:schema`, `npm run db:seed` on an **empty** DB).
- Cloudflare scoped token: `worker/.cloudflare.env` or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` ([external-auth.md](./external-auth.md)).
- **Disable email confirmation** for demo logins (same as local): [database-setup.md](./database-setup.md).

---

## Architecture

```txt
Browser → Cloudflare Pages (static dist/)
       → Worker URL (/api/*)  [CORS allows Pages origin]
       → Supabase (Auth + Realtime in browser; CRM data via Worker)
```

Local dev uses `localhost:5173` + `localhost:8787`. Production uses **two URLs** you must wire together.

---

## Step 1 — Supabase (production project)

Use a dedicated production project or your main dev project (assessment demo: one project is fine).

1. Apply schema and seed (empty DB only):
   ```bash
   # Point worker/.dev.vars at production keys, then:
   npm run db:schema
   npm run db:seed
   ```
2. **Authentication → URL configuration** (after you know the Pages URL):
   - **Site URL:** `https://<your-project>.pages.dev`
   - **Redirect URLs:** add the same URL (and custom domain if any)

You will update redirect URLs again after Pages deploy if the URL was unknown.

---

## Step 2 — Worker secrets (one-time per Worker)

Worker **runtime** secrets are **not** in `wrangler.toml`. Set them with Wrangler (values from Supabase dashboard):

```bash
cd worker
npx wrangler secret put SUPABASE_URL
# paste: https://<ref>.supabase.co

npx wrangler secret put SUPABASE_SECRET_KEY
# paste: sb_secret_... from Project Settings → API

npx wrangler secret put CORS_ORIGINS
# paste: https://<your-project>.pages.dev
# (comma-separated for multiple origins; no trailing slashes)
```

List secrets:

```bash
cd worker && npx wrangler secret list
```

`CORS_ORIGINS` is required for production so the browser can call the API from Pages. Local origins (`localhost:5173`) are always allowed in code.

---

## Step 3 — Deploy the Worker

```bash
npm run deploy:worker
```

This runs `scripts/ensure-cloudflare-auth.sh` then `wrangler deploy` from `worker/`.

Note the **workers.dev** URL in the output, for example:

`https://sinc-crm-api.<account>.workers.dev`

---

## Step 4 — Production frontend env

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_API_BASE_URL=https://sinc-crm-api.<account>.workers.dev
```

`VITE_*` variables are **baked in at build time**. Rebuild and redeploy Pages after changing them.

---

## Step 5 — Deploy Cloudflare Pages

```bash
npm run deploy:pages
```

Default project name: `sinc-crm`. Override:

```bash
PAGES_PROJECT_NAME=my-crm npm run deploy:pages
```

First deploy may prompt to create the Pages project in your account.

Note the **Pages URL**, for example: `https://sinc-crm.pages.dev`

---

## Step 6 — Align CORS and Supabase Auth

1. If Pages URL was not known when you set secrets:
   ```bash
   cd worker
   npx wrangler secret put CORS_ORIGINS
   # https://sinc-crm.pages.dev
   npm run deploy:worker
   ```
2. Update Supabase **Site URL** and **Redirect URLs** to the Pages URL (Step 1).

---

## Step 7 — Verify deployment

```bash
# After .env.production has non-local VITE_API_BASE_URL:
npm run verify:stack:deploy
```

Checks `GET <VITE_API_BASE_URL>/api/health` → `200`.

Optional production smoke (skipped until URLs are set):

```bash
DEPLOY_PAGES_URL=https://sinc-crm.pages.dev \
DEPLOY_API_URL=https://sinc-crm-api.<account>.workers.dev \
npx playwright test e2e/specs/phase-14-deploy.spec.ts
```

Or add URLs to `.env.production` and pass `PLAYWRIGHT_BASE_URL` / `VITE_API_BASE_URL`.

---

## Scripts reference

| Command | Action |
|---------|--------|
| `npm run deploy:worker` | `wrangler deploy` (API) |
| `npm run deploy:pages` | `npm run build` + `wrangler pages deploy dist` |
| `npm run deploy` | Worker then Pages |
| `npm run verify:stack:deploy` | Health check against `VITE_API_BASE_URL` |

---

## CI / headless deploy

In pipelines, set `CI=true` and inject secrets ([external-auth.md](./external-auth.md)):

- `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- Build: write `.env.production` from CI secrets, then `npm run build`
- Worker: `cd worker && npx wrangler deploy` with secrets preconfigured in the dashboard or `wrangler secret bulk`

Do not commit `.env.production` or Wrangler secrets.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error in browser | `CORS_ORIGINS` must match Pages origin exactly; redeploy Worker |
| Login redirect fails | Supabase Auth Site URL / Redirect URLs must include Pages URL |
| API 401 on `/api/me` | Expected without token; use `/api/health` for smoke |
| Old API URL in UI | Rebuild: `.env.production` → `npm run deploy:pages` |
| `wrangler deploy` auth fail | Token permissions; see [cloudflare-auth.md](./cloudflare-auth.md) |
| Schema on wrong DB | `db:schema` only on **empty** DB; use a dedicated prod project |

---

## Record your live URLs

After deploy, update the root [README.md](../README.md#deployment) (for assessors):

| Service | URL |
|---------|-----|
| Pages (app) | `https://…` |
| Worker (API) | `https://…` |
| Supabase | `https://<ref>.supabase.co` |

Phase handoff: [phases/phase-14-deploy.md](./phases/phase-14-deploy.md) · Next: [phase-15-submission.md](./phases/phase-15-submission.md)
