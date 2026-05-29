[← Back to README — Deployment](../README.md#deployment)

# Deployment guide (Phase 14)

Deploy the **Cloudflare Worker API** and **Cloudflare Pages** frontend against your **production Supabase** project.

This guide is for a **first manual deploy** using the existing npm scripts. A future **two-pass deploy script** (fill gaps after URLs exist) is planned but **not included yet** — follow this guide step by step for now.

| Component | Host | Where config lives |
|-----------|------|-------------------|
| Frontend (Vite SPA) | Cloudflare Pages | `.env.production` — **baked in at build time** |
| API (Hono) | Cloudflare Workers | Wrangler **secrets** (runtime; not in git) |
| Database | Supabase | `npm run db:schema` (+ optional seed) |
| Auth redirects | **Supabase Dashboard** | Authentication → URL configuration |
| Browser → API CORS | **Worker code + secret** | `CORS_ORIGINS` secret (not Cloudflare Pages settings) |

Related: [external-auth.md](./external-auth.md) · [cloudflare-auth.md](./cloudflare-auth.md) · [database-setup.md](./database-setup.md) · [phases/phase-14-deploy.md](./phases/phase-14-deploy.md)

---

## How we deploy (now vs later)

| Approach | Status | Notes |
|----------|--------|--------|
| **Manual / scripted CLI** (this guide) | **Current** | `npm run deploy:worker`, `deploy:pages`, Wrangler token in `worker/.cloudflare.env` or env vars |
| **GitHub → Cloudflare** (git push triggers Pages; Actions for Worker) | **Valid, not wired in repo yet** | Cloudflare can connect a GitHub repo for Pages builds; Worker deploy via GitHub Actions + secrets. Planned for a later phase alongside the CLI path. |
| **End-to-end deploy script** (two passes) | **Planned** | Automate Pass 1 + Pass 2 below after manual deploy is proven |

Both **CLI** and **GitHub CI** deployments are valid for production. This repository **chooses the CLI path for now** so you can deploy without enabling GitHub integrations. Future docs and automation will support **both**.

---

## Architecture

```txt
Browser → Cloudflare Pages (static dist/)
       → Worker URL (/api/*)     [CORS: CORS_ORIGINS secret + code in worker/src]
       → Supabase (Auth + Realtime in browser; CRM data via Worker)
```

Local dev: `http://localhost:5173` + `http://localhost:8787`.  
Production: **two public URLs** (Pages + Worker) plus **Supabase Dashboard** auth settings — they are configured in different places (see table above).

---

## Pages URL: stable vs deployment preview (read before Pass 2)

`npm run deploy:pages` runs `wrangler pages deploy`. Wrangler prints **two different** `pages.dev` URLs:

| URL type | Looks like | Use for production? |
|----------|------------|---------------------|
| **Deployment preview** | `https://de21a19d.sinc-crm-esg.pages.dev` | **No** — hash changes every deploy; easy CORS mistakes |
| **Stable project URL** | `https://sinc-crm-esg.pages.dev` | **Yes** — bookmark, README, CORS, Supabase Auth |

The preview URL is the deployment row Wrangler shows right after upload (first 8 characters of the deployment ID + your project domain). The **stable** URL is the project’s **Project Domains** entry.

**Where to get the stable URL**

1. **After `npm run deploy:pages`** — read the script footer (`USE THIS (stable production URL): …`), not the hash URL in Wrangler’s table above it.
2. **CLI:** `cd worker && npx wrangler pages project list` → column **Project Domains** (e.g. `sinc-crm-esg.pages.dev` → app is `https://sinc-crm-esg.pages.dev`).
3. **Dashboard:** Cloudflare → **Workers & Pages** → project **sinc-crm** → overview / domains.

**Why this mattered:** `CORS_ORIGINS` and Supabase Auth must match the **exact origin** you open in the browser. Preview and stable URLs are different origins. Using the preview URL while CORS lists only the stable URL produces `/api/me` CORS errors even when login against Supabase succeeds.

**Not a mistake on your side if you copied Wrangler’s first URL** — the deploy script used to say “Copy the pages.dev URL from the output above”, which points at the preview line. Use the stable URL only.

---

## Two-pass overview (read this first)

Deploy is intentionally **two passes** because the Pages URL is unknown until after Pages deploy, and the Worker URL is unknown until after Worker deploy.

```txt
Pass 1 — Deploy what you can
  1. Supabase: schema (required); seed (optional, demo only)
  2. Worker: secrets SUPABASE_URL + SUPABASE_SECRET_KEY (CORS can wait)
  3. npm run deploy:worker  →  copy workers.dev URL
  4. .env.production with Worker URL
  5. npm run deploy:pages   →  note stable Pages URL (script footer; not preview hash URL)

Pass 2 — Wire URLs (no full redeploy required for CORS secret alone)
  6. Worker: CORS_ORIGINS = stable Pages origin only (exact, no trailing slash)
  7. Supabase Dashboard: Site URL + Redirect URLs = same stable origin
  8. npm run verify:stack:deploy (+ optional Playwright smoke)
  9. Record URLs in README (and optional local notes file)
```

**Pass 2 can be done minutes later** — you do not need to repeat Pass 1 unless you change Worker code or Pages build env.

---

## Prerequisites

- **Cloudflare:** scoped API token — `worker/.cloudflare.env` or `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` ([external-auth.md](./external-auth.md), [cloudflare-auth.md](./cloudflare-auth.md)).
- **Supabase:** a project for production (one project for demo + prod is fine for a portfolio deploy). Keys in `worker/.dev.vars` or exported env ([database-setup.md](./database-setup.md)).
- **Empty database** for `npm run db:schema` (script refuses if tables already exist).
- **Node 22+** and `npm run setup:local` (Wrangler available under `worker/`).

**Optional for demo / portfolio walkthrough:**

- `npm run db:seed` — demo users (`manager1@demo.local`, password `demo1234`, etc.).
- Disable email confirmation in Supabase — [database-setup.md](./database-setup.md#4-email-confirmation-disabled-demo-only).

**Not required for an empty production CRM you fill yourself:** seed and demo auth settings. Create real users via sign-up or the Supabase dashboard instead.

---

## Pass 1

### Step 1 — Supabase database (production project)

Use a **dedicated** Supabase project (recommended). Point `worker/.dev.vars` at that project’s URL, secret key, and `SUPABASE_DB_URL` (transaction pooler) — same as local setup.

**Required (empty DB only):**

```bash
npm run db:schema
```

**Optional — demo walkthrough:**

```bash
npm run db:seed
```

| Command | When to run |
|---------|-------------|
| `db:schema` | Once on an **empty** project — tables, RLS, triggers |
| `db:seed` | Optional — demo auth users + sample CRM rows; skip for empty prod you fill yourself |

**Do not run** `db:schema` or `db:seed` on a database that already has data (scripts exit by design).

**Supabase Auth URL settings — defer to Pass 2.**  
You need the **Cloudflare Pages** URL first. Skip Step 7 in Pass 2 until after `deploy:pages`.

---

### Step 2 — Worker secrets (one-time per Worker name)

Production secrets are stored in **Cloudflare**, not in `wrangler.toml` or git.  
`worker/.dev.vars` is for **`wrangler dev` only** — it is **not** uploaded when you run `deploy:worker`.

**Required before first Worker deploy:**

| Secret | Value source |
|--------|----------------|
| `SUPABASE_URL` | Supabase Dashboard → **Project Settings** → **API** → Project URL |
| `SUPABASE_SECRET_KEY` | Same page → **Secret** key (`sb_secret_…`) |

**Set after you know the Pages URL (Pass 2):**

| Secret | Value |
|--------|--------|
| `CORS_ORIGINS` | **Stable** Pages origin, e.g. `https://sinc-crm-esg.pages.dev` (**not** `https://<hash>.….pages.dev`; no trailing slash) |

#### Option A — Interactive (fine for first deploy)

```bash
cd worker
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
# CORS_ORIGINS — in Pass 2, or now if you already know the Pages URL
npx wrangler secret put CORS_ORIGINS
```

#### Option B — From a gitignored env file (easier to repeat / CI later)

Wrangler accepts a `.env`-style file or JSON:

```bash
cd worker
# Example: worker/.production.secrets (create locally, never commit)
# SUPABASE_URL=https://<ref>.supabase.co
# SUPABASE_SECRET_KEY=sb_secret_...
# CORS_ORIGINS=https://<project-domains-from-wrangler-pages-project-list>

npx wrangler secret bulk .production.secrets
# Or on deploy:
# npx wrangler deploy --secrets-file .production.secrets
```

List what is set (names only):

```bash
cd worker && npx wrangler secret list
```

**CORS behaviour:** `localhost:5173` is always allowed in code. Production Pages origin must appear in `CORS_ORIGINS`. This is implemented in `worker/src/index.ts` (Hono `cors` middleware), **not** in the Cloudflare Pages dashboard “CORS” UI.

---

### Step 3 — Deploy the Worker

```bash
npm run deploy:worker
```

Runs `scripts/ensure-cloudflare-auth.sh` then `wrangler deploy` from `worker/`.

**Copy the URL from the terminal output**, for example:

`https://sinc-crm-api.<your-subdomain>.workers.dev`

Default Worker name: `sinc-crm-api` (`worker/wrangler.toml`).  
If you miss the URL: Cloudflare Dashboard → **Workers & Pages** → **sinc-crm-api** → overview, or run deploy again and read the line `Published sinc-crm-api`.

---

### Step 4 — Production frontend env (build-time)

```bash
cp .env.production.example .env.production
```

Edit `.env.production`:

```env
VITE_SUPABASE_URL=https://<ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
VITE_API_BASE_URL=https://sinc-crm-api.<your-subdomain>.workers.dev
```

`VITE_*` values are **embedded in the static bundle** when you build. If you change them, run **`npm run deploy:pages` again** (rebuild). There is no runtime override on Pages for these variables.

---

### Step 5 — Deploy Cloudflare Pages

```bash
npm run deploy:pages
```

Default Pages project name: `sinc-crm`. Override:

```bash
PAGES_PROJECT_NAME=my-crm npm run deploy:pages
```

First run may create the Pages project in your account.

Wrangler will print a **deployment preview** URL in its table (e.g. `https://de21a19d.sinc-crm-esg.pages.dev`). **Ignore that for production wiring.**

Use the **stable** URL printed at the end of the script, for example:

`https://sinc-crm-esg.pages.dev`

To look it up yourself:

```bash
cd worker && npx wrangler pages project list
# → Project Domains column, e.g. sinc-crm-esg.pages.dev → https://sinc-crm-esg.pages.dev
```

See [Pages URL: stable vs deployment preview](#pages-url-stable-vs-deployment-preview-read-before-pass-2).

---

## Pass 2 — Wire production URLs

### Step 6 — Worker CORS (`CORS_ORIGINS`)

Set the secret to your **exact** Pages origin:

```bash
cd worker
npx wrangler secret put CORS_ORIGINS
# e.g. https://sinc-crm-esg.pages.dev  (stable URL only — not https://<hash>.sinc-crm-esg.pages.dev)
```

Or update via `wrangler secret bulk` / `--secrets-file` (see Step 2).

**Redeploying Worker code is not required** for a secret-only change — new requests pick up the updated secret. Redeploy only if you also changed Worker source or `wrangler.toml`.

---

### Step 7 — Supabase Auth URLs (Supabase Dashboard)

**Where:** [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **URL configuration**

**Not** configured in Cloudflare. Use your **Pages** URL, not the Worker URL.

| Field | Set to |
|-------|--------|
| **Site URL** | Stable Pages URL, e.g. `https://sinc-crm-esg.pages.dev` |
| **Redirect URLs** | Add the same stable URL (and any custom domain later) |

**What this does:** Supabase Auth **allowlists browser redirect targets** after OAuth, magic links, recovery, etc. It is separate from Worker **CORS** (which allowlists `fetch` from the SPA to `/api/*`).

This app uses **email/password** sign-in in the SPA; redirect settings still matter for some auth flows and for troubleshooting “login redirect” errors.

**Demo only:** if you use seeded users, keep email confirmation disabled per [database-setup.md](./database-setup.md).

---

### Step 8 — Verify deployment

```bash
npm run verify:stack:deploy
```

Requires `.env.production` with a non-local `VITE_API_BASE_URL`. Checks `GET <VITE_API_BASE_URL>/api/health` → `200`.

**Optional** production smoke (needs demo seed for DEPLOY-02 login):

```bash
DEPLOY_PAGES_URL=https://sinc-crm-esg.pages.dev \
DEPLOY_API_URL=https://sinc-crm-api.<your-subdomain>.workers.dev \
npx playwright test e2e/specs/phase-14-deploy.spec.ts
```

---

### Step 9 — Record live URLs

Update the root [README.md](../README.md#deployment) table with your live URLs (portfolio, sharing, and smoke tests).

**Recommended:** keep a **local, gitignored** note so you do not rely on terminal scrollback, for example `deploy-urls.local.txt`:

```txt
Pages=https://sinc-crm-esg.pages.dev
Worker=https://sinc-crm-api.<subdomain>.workers.dev
Supabase=https://<ref>.supabase.co
```

Do not commit secrets or `.env.production`.

---

## Quick command reference

| Command | Action |
|---------|--------|
| `npm run deploy:worker` | Deploy API (`wrangler deploy`) |
| `npm run deploy:pages` | `npm run build` + `wrangler pages deploy dist` |
| `npm run deploy` | Worker, then Pages (Pass 1 steps 3 + 5 only — still do Pass 2 manually) |
| `npm run verify:stack:deploy` | Health check against `VITE_API_BASE_URL` |

---

## Configuration cheat sheet

| Concern | Where to set | Example |
|---------|--------------|---------|
| Postgres schema | CLI `npm run db:schema` | Empty Supabase project |
| Demo users/data | CLI `npm run db:seed` (optional) | Demo / walkthrough only |
| API Supabase keys | Worker secrets | `SUPABASE_URL`, `SUPABASE_SECRET_KEY` |
| Browser → API CORS | Worker secret `CORS_ORIGINS` | Stable Pages URL only (see [stable vs preview](#pages-url-stable-vs-deployment-preview-read-before-pass-2)) |
| SPA Supabase + API URL | `.env.production` → rebuild Pages | `VITE_*` |
| Auth redirect allowlist | **Supabase Dashboard** → Authentication → URL configuration | Pages URL |
| Cloudflare login for CLI | `worker/.cloudflare.env` or env | Token + account ID |

---

## CI / GitHub (future; manual CLI today)

**Today:** deploy from your machine with `npm run deploy:*` and a Cloudflare API token ([cloudflare-auth.md](./cloudflare-auth.md)).

**Later (both supported):**

- **GitHub Actions:** `CI=true`, inject `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, write `.env.production` from secrets, `wrangler deploy` + `wrangler pages deploy`, Worker secrets via `wrangler secret bulk` or dashboard.
- **Cloudflare Git integration:** connect the repo in the Cloudflare dashboard so **pushes build Pages**; Worker still needs a workflow or manual deploy unless you add Actions.

E2E in CI is documented separately ([ci-e2e-recipe.md](./ci-e2e-recipe.md)) — that is **testing**, not production deploy.

Do not commit `.env.production`, `worker/.dev.vars`, or secret files.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS error calling `/api/*` from the app | Open the **stable** Pages URL (`wrangler pages project list` → Project Domains), not the deployment preview (`https://<hash>.….pages.dev`). Set `CORS_ORIGINS` to that **exact** origin (no trailing `/`). |
| Used preview URL by mistake | Browse `https://<project-domains>` instead; update `CORS_ORIGINS` and Supabase Auth to match — do not add a new preview hash each deploy. |
| Secret name typo | Must be `CORS_ORIGINS`, not `CROSS_ORIGINS` |
| `/api/me` returns 503 “Supabase is not configured” | Set Worker secrets `SUPABASE_URL` and `SUPABASE_SECRET_KEY` (`wrangler secret list` must show all three) |
| Login works but stay on login page | Session exists but `/api/me` failed (CORS or 503) — `role` never loads; fix Worker secrets + stable origin |
| Login redirect / auth URL errors | **Supabase Dashboard** → Authentication → URL configuration — Site URL + Redirect URLs must include the Pages URL |
| API 401 on `/api/me` without login | Expected — use `/api/health` for smoke |
| UI still calls old API | Update `.env.production` → `npm run deploy:pages` (rebuild) |
| `wrangler deploy` auth fail | Token permissions; [cloudflare-auth.md](./cloudflare-auth.md) |
| `db:schema` / `db:seed` refused | DB not empty — use a fresh project or follow [database-setup.md](./database-setup.md) reset guidance |
| DEPLOY-02 smoke fails | Run `db:seed` or sign in with a real manager account |

---

## Planned automation (not in repo yet)

A **two-pass deploy script** will:

1. Run Pass 1 (schema → worker → pages) where values are known from env/files.
2. Capture URLs from Wrangler output (or predictable project names).
3. Run Pass 2 (CORS secret, print Supabase Dashboard checklist for Auth URLs).

Until that exists, use this guide for manual deploy. After your first successful deploy, that script will be added for repeatable/autonomous runs.

Phase handoff: [phases/phase-14-deploy.md](./phases/phase-14-deploy.md) · Next: [phase-15-submission.md](./phase-15-submission.md) (production launch checklist)
