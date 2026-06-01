# SINC Student CRM

A full-stack student CRM with role-based access, realtime chat, deal pipeline, and a manager dashboard. The SPA runs on Vite + React; the API runs on Cloudflare Workers (Hono); data and auth use Supabase.

## Quick start

**Canonical guide:** [docs/quick-start.md](docs/quick-start.md) — scripted setup (Linux/WSL), env files, cloud credentials, database, and dev servers.

At a glance:

1. Clone → copy env examples (`.env`, `worker/.dev.vars`, `worker/.cloudflare.env`)
2. `npm run install:linux` (or `npm run setup:local` if Node 22+ is already active)
3. Paste keys → `npm run setup:cloud` → `npm run db:schema` → `npm run db:seed`
4. `npm run dev` + `cd worker && npm run dev` → open [http://localhost:5173](http://localhost:5173)

Demo users and tests: sections below. Manual / Windows paths: [quick-start.md](docs/quick-start.md).

## Demo users

Password for all seeded accounts: **`demo1234`** (override with `SEED_DEMO_PASSWORD` when seeding).

| Role | Email | Notes |
|------|-------|--------|
| Manager | `manager1@demo.local` | Dashboard, full nav |
| Sales | `sales1@demo.local`, `sales2@demo.local` | Clients, conversations, pipeline |
| Client | `client1@demo.local`, `client2@demo.local` | Own profile and chat only |

## Running tests

Run **`npm run test:e2e`** for the full isolated Playwright suite (creates a temporary Supabase project, seeds, tests, deletes). For day-to-day dev against your existing `.env`, use **`npm run test:e2e:dev`**. Worker unit tests: **`npm run test:worker`**.

Full catalog, commands, and how to add tests: [docs/testing-guide.md](docs/testing-guide.md#back-to-readme). Tooling auth ladder: `npm run test:scripts`.

## Documentation

| Topic | Quick link |
|-------|------------|
| **API reference (OpenAPI)** | [docs/api/openapi.yaml](docs/api/openapi.yaml) · [interactive viewer](docs/api/index.html) |
| Quick start (install, env, scripts) | [docs/quick-start.md](docs/quick-start.md#back-to-readme) |
| Database schema & seed | [docs/database-setup.md](docs/database-setup.md#back-to-readme) |
| Tooling auth (Cloudflare / Supabase / GitHub) | [docs/external-auth.md](docs/external-auth.md#back-to-readme) |
| **How to work on the codebase** | [docs/development-guide.md](docs/development-guide.md#back-to-readme) |
| Testing (all tests + how to add) | [docs/testing-guide.md](docs/testing-guide.md#back-to-readme) |
| Full project guide | [docs/project-guide.md](docs/project-guide.md#back-to-readme) |
| Roadmap & future work | [docs/roadmap.md](docs/roadmap.md#back-to-readme) |
| Deployment | [docs/deploy-guide.md](docs/deploy-guide.md#back-to-readme) |
| All docs index | [docs/README.md](docs/README.md) |

## Requirements

Product specs live in [`project_requirements/`](project_requirements/) (architecture, database, acceptance criteria).

## Future work

Post-MVP improvements and deferred items: [docs/roadmap.md](docs/roadmap.md#back-to-readme).

## Deployment

**Production:** follow the two-pass guide — [docs/deploy-guide.md](docs/deploy-guide.md#back-to-readme) (manual CLI today; GitHub→Cloudflare CI is a valid alternative we will document later).

To reset Supabase data or schema **without deleting the project** (fast dev iteration), see [database-setup.md — Reset database](docs/database-setup.md#reset-database-without-deleting-the-project).

```bash
# End-to-end (recommended) — see deploy-guide.md
npm run deploy:all -- --skip-db    # use --skip-db if schema already exists

# Or manual two-pass:
# npm run db:schema              # empty Supabase project only (first time)
# npm run deploy:worker && npm run deploy:pages
# npm run verify:stack:deploy
```

| Service | URL |
|---------|-----|
| App (Cloudflare Pages) | [https://sinc-crm-esg.pages.dev](https://sinc-crm-esg.pages.dev) (stable project domain — see [deploy-guide](docs/deploy-guide.md#pages-url-stable-vs-deployment-preview-read-before-pass-2)) |
| API (Cloudflare Worker) | [https://sinc-crm-api.prinxlexter.workers.dev](https://sinc-crm-api.prinxlexter.workers.dev) |
| Supabase | [https://fgoqijltbhkrztxjebjm.supabase.co](https://fgoqijltbhkrztxjebjm.supabase.co) |
