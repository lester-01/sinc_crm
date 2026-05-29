# SINC Student CRM

A full-stack student CRM with role-based access, realtime chat, deal pipeline, and a manager dashboard. The SPA runs on Vite + React; the API runs on Cloudflare Workers (Hono); data and auth use Supabase.

## Quick start

1. **Clone** the repository and `cd` into it.
2. **Environment** — copy examples and paste keys, or export the same variables (see [external-auth.md](external-auth.md)):
   ```bash
   cp .env.example .env
   cp worker/.dev.vars.example worker/.dev.vars
   cp worker/.cloudflare.env.example worker/.cloudflare.env
   ```
3. **Install** (Linux/WSL): `npm run install:linux` — or `npm run setup:local` if Node 22+ is already active.
4. **Cloud credentials** (once): `npm run setup:cloud` — see [quick-start.md](quick-start.md#back-to-readme).
5. **Database** (empty Supabase project): `npm run db:schema` then `npm run db:seed`.
6. **Run** — terminal 1: `npm run dev` (frontend `:5173`); terminal 2: `cd worker && npm run dev` (API `:8787`).
7. **Open** [http://localhost:5173](http://localhost:5173) and sign in with a demo user below.

## Demo users

Password for all seeded accounts: **`demo1234`** (override with `SEED_DEMO_PASSWORD` when seeding).

| Role | Email | Notes |
|------|-------|--------|
| Manager | `manager1@demo.local` | Dashboard, full nav |
| Sales | `sales1@demo.local`, `sales2@demo.local` | Clients, conversations, pipeline |
| Client | `client1@demo.local`, `client2@demo.local` | Own profile and chat only |

## Running tests

Run **`npm run test:e2e`** for the full isolated Playwright suite (creates a temporary Supabase project, seeds, tests, deletes). For day-to-day dev against your existing `.env`, use **`npm run test:e2e:dev`**. Worker unit tests: **`npm run test:worker`**.

Full catalog, commands, and how to add tests: [testing-guide.md](testing-guide.md#back-to-readme). Tooling auth ladder: `npm run test:scripts`.

## Documentation

| Topic | Quick link |
|-------|------------|
| **API reference (OpenAPI)** | [docs/api/openapi.yaml](docs/api/openapi.yaml) · [interactive viewer](docs/api/index.html) |
| Quick start (install, env, Phase 4) | [quick-start.md](quick-start.md#back-to-readme) |
| Stack setup & phase checklist | [stack-setup.md](stack-setup.md#back-to-readme) |
| Database schema & seed | [database-setup.md](database-setup.md#back-to-readme) |
| Tooling auth (Cloudflare / Supabase / GitHub) | [external-auth.md](external-auth.md#back-to-readme) |
| **How to work on the codebase** | [development-guide.md](development-guide.md#back-to-readme) |
| Testing (all tests + how to add) | [testing-guide.md](testing-guide.md#back-to-readme) |
| Full project guide | [project-guide.md](project-guide.md#back-to-readme) |
| Roadmap & future work | [roadmap.md](roadmap.md#back-to-readme) |
| Deployment (Phase 14) | [deploy-guide.md](deploy-guide.md#back-to-readme) |
| All docs index | [docs/README.md](docs/README.md) |

## Requirements

Product specs live in [`project_requirements/`](project_requirements/) (architecture, database, acceptance criteria).

## Future work

Post-MVP improvements and deferred items: [roadmap.md](roadmap.md#back-to-readme).

## Deployment

**Production:** follow the two-pass guide — [deploy-guide.md](deploy-guide.md#back-to-readme) (manual CLI today; GitHub→Cloudflare CI is a valid alternative we will document later).

```bash
# Pass 1 — see deploy-guide.md for secrets, optional db:seed, and order
npm run db:schema                              # empty Supabase project only
# npm run db:seed                              # optional: demo users for walkthrough

cd worker && npx wrangler secret put SUPABASE_URL
# … SUPABASE_SECRET_KEY (CORS_ORIGINS after Pages URL is known)

cp .env.production.example .env.production     # VITE_* including Worker URL after deploy:worker
npm run deploy:worker
npm run deploy:pages

# Pass 2 — CORS_ORIGINS secret + Supabase Dashboard Auth URLs → then:
npm run verify:stack:deploy
```

| Service | URL (fill in after you deploy) |
|---------|--------------------------------|
| App (Cloudflare Pages) | `https://________________.pages.dev` (stable project URL — see [deploy-guide](deploy-guide.md#pages-url-stable-vs-deployment-preview-read-before-pass-2)) |
| API (Cloudflare Worker) | `https://________________.workers.dev` |
| Supabase | `https://________________.supabase.co` |
