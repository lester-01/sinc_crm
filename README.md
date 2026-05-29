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

Full catalog, commands, and how to add tests: [testing-guide.md](testing-guide.md#back-to-readme).

## Documentation

| Topic | Quick link |
|-------|------------|
| Quick start (install, env, Phase 4) | [quick-start.md](quick-start.md#back-to-readme) |
| Stack setup & phase checklist | [stack-setup.md](stack-setup.md#back-to-readme) |
| Database schema & seed | [database-setup.md](database-setup.md#back-to-readme) |
| Tooling auth (Cloudflare / Supabase / GitHub) | [external-auth.md](external-auth.md#back-to-readme) |
| Testing (all tests + how to add) | [testing-guide.md](testing-guide.md#back-to-readme) |
| Full project guide | [project-guide.md](project-guide.md#back-to-readme) |
| Roadmap & future work | [roadmap.md](roadmap.md#back-to-readme) |
| Deployment (Phase 14) | [deploy-guide.md](deploy-guide.md#back-to-readme) |
| All docs index | [docs/README.md](docs/README.md) |

## Requirements

Product and assessment specs live in [`project_requirements/`](project_requirements/) (architecture, database, evaluation criteria).

## Future work

Post-MVP improvements and deferred items: [roadmap.md](roadmap.md#back-to-readme).

## Deployment

Production deploy steps are completed in **Phase 14**. Until then, see the stub [deploy-guide.md](deploy-guide.md#back-to-readme).
