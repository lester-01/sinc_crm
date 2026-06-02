# SINC Student CRM

SINC is a CRM for education agencies placing students abroad. It helps sales teams coordinate student inquiries, track applications through the pipeline, and manage placements—all in one organized workspace. Managers get visibility into team progress and can reassign work as needed.

## Core Features

Role-based access for managers and sales teams. Real-time chat between students and staff. Deal pipeline board for tracking study placements. Manager dashboard with team visibility. Responsive web interface.

## Live Demo

Visit [https://sinc-crm-esg.pages.dev](https://sinc-crm-esg.pages.dev) to test the application.

Sign in with any demo account below (password: `demo1234`):
## Demo users

Password for all seeded accounts: **`demo1234`**.

| Role | Email | Display name | Notes |
|------|-------|--------------|-------|
| Manager | `manager1@demo.local` | Morgan Manager | Dashboard, full nav |
| Manager | `manager2@demo.local` | Alex Manager | Same role capabilities |
| Sales | `sales1@demo.local` | Sam Sales | Clients, conversations, pipeline |
| Sales | `sales2@demo.local` | Jordan Sales | Clients, conversations, pipeline |
| Sales | `sales3@demo.local` | Riley Sales | Clients, conversations, pipeline |
| Client | `client1@demo.local` | Aida Client | Assigned thread + deal (`new_lead`) |
| Client | `client2@demo.local` | Bek Client | Assigned thread + deal (`contacted`) |
| Client | `client3@demo.local` | Cara Client | Assigned thread + deal (`consultation_booked`) |
| Client | `client4@demo.local` | Dana Client | Unassigned queue thread, no deal |

CRM-only row without auth login: `prospect.no.login@example.com` — see [database-setup.md — Seed composition](docs/database-setup.md#6-seed-composition-your-requirements).

## Screenshots

| Login | 
|-------|
| ![Login screen](images/sinc_login.png) |  

| Demo accounts |  
|---------------|  
![Demo account picker](images/sinc_demo_accounts.png) |  

**Manager** — dashboard, clients, client detail, pipeline:

| Dashboard |  
|-----------|  
| ![Manager dashboard](images/sinc_manager_dashboard.png) |  

| Clients |  
|---------|
| ![Manager clients list](images/sinc_manager_clients.png) |  

| Client detail |  
|---------------|  
| ![Manager client detail](images/sinc_manager_client_info.png) |  

| Pipeline |  
|----------|  
| ![Manager pipeline](images/sinc_manager_pipeline.png) |  

**Sales** — conversation workspace:

![Sales chat](images/sinc_sales_chat.png)

**Client** — profile and chat:

| Profile |  
|---------|  
| ![Client profile](images/sinc_client_profile.png) |  

| Chat |
|------|
![Client chat](images/sinc_client_chat.png) |

## Tech Stack

**Frontend:** React, TypeScript, Vite, React Router, TanStack Query, shadcn/ui, Tailwind CSS

**Backend:** Cloudflare Workers, Hono, TypeScript

**Database:** Supabase (PostgreSQL, Auth, Realtime)

**Testing:** Playwright, Vitest

**Deployment:** Cloudflare Pages (frontend), Cloudflare Workers (API)

## Why This Project Matters

**Production Architecture** — The app is deployed and accessible. It's not a tutorial project or sandbox; it demonstrates how to build and ship real software.

**Technical Depth** — Covers authentication, real-time sync, role-based access control (RLS), sales pipeline logic, and multi-role UI patterns. Not toy examples.

**Testing at Scale** — 60+ end-to-end tests in isolated environments. This shows testing discipline and confidence in the codebase.

**Security-First Design** — Row-level security policies, threat model documentation, and proper credential management. Not an afterthought.

**Well-Documented** — 12+ guides covering architecture, setup, security, and deployment. Shows ability to communicate complex systems.

**Built for Extension** — Foundation is solid enough to add features. See the roadmap for what's next.

## Quick start

**Canonical guide:** [docs/quick-start.md](docs/quick-start.md) — automated setup (Linux/WSL), env files, hosted Supabase schema/seed, and local dev servers.

## Running tests

Run **`npm run test:e2e`** for the full isolated Playwright suite (creates a temporary Supabase project, seeds, tests, deletes — 60 tests total). For day-to-day dev against your existing `.env`, see [docs/testing-guide.md](docs/testing-guide.md).

Full catalog, commands, and how to add tests: [docs/testing-guide.md](docs/testing-guide.md#back-to-readme). Tooling auth ladder: `npm run test:scripts`.

## Releases

| Tag | Notes |
|-----|-------|
| **v1.4.0** (latest) | Single root `.env`, RLS security hardening, isolated E2E, script/verify refactor, manager RBAC |
| v1.3.0 | Pre–infra-overhaul baseline — use if v1.4.0 setup surprises you |

```bash
git checkout v1.4.0   # latest release (recommended)
git checkout v1.3.0   # known-stable fallback before major code overhaul
```

## Documentation

| Topic | Quick link |
|-------|------------|
| **API reference (OpenAPI)** | [docs/api/openapi.yaml](docs/api/openapi.yaml) · [interactive viewer](docs/api/index.html) |
| Quick start (install, env, scripts) | [docs/quick-start.md](docs/quick-start.md#back-to-readme) |
| **Script reference (setup / verify)** | [docs/script-reference.md](docs/script-reference.md) |
| Database schema & seed | [docs/database-setup.md](docs/database-setup.md#back-to-readme) |
| **Security (RLS, keys, threat model)** | [docs/security-architecture.md](docs/security-architecture.md) |
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

**Canonical guide:** [docs/deploy-guide.md](docs/deploy-guide.md) — `npm run deploy:all` (automated two-pass) or manual Worker + Pages steps.

To reset Supabase data or schema **without deleting the supabase project** (fast dev iteration), see [docs/database-setup.md](docs/database-setup.md).
