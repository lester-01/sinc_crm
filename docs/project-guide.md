[← Back to README — Documentation](../README.md#documentation)

# Project guide

Long-form reference for assessors and maintainers. Short onboarding: [README.md](../README.md).

---

## 1. Overview

**SINC Student CRM** — multi-role CRM with conversations (chat), deal pipeline, and manager analytics. Stack: React SPA (Vite), Cloudflare Worker API (Hono), Supabase (Postgres + Auth + Realtime).

Goals and acceptance criteria: [project_requirements/](../project_requirements/) especially [evaluation.md](../project_requirements/evaluation.md).

---

## 2. Architecture & data flow

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Frontend | `src/` | UI, Router, TanStack Query, Supabase client for auth/realtime |
| API | `worker/src/` | REST under `/api/*`, JWT validation, RLS-aligned queries |
| Database | Supabase | Tables, RLS policies, seed data |

**Rule:** CRM mutations and reads go through the **Worker**. The browser Supabase client is for **login session** and **realtime subscriptions**, not direct table writes for CRM entities.

Detail: [project_requirements/architecture.md](../project_requirements/architecture.md).

---

## 3. Infrastructure (Phases 1–5)

Install, worker/frontend scaffold, cloud env files, schema + seed:

- [infrastructure-phases.md](./infrastructure-phases.md) — summary table per phase
- [quick-start.md](./quick-start.md) — install commands
- [stack-setup.md](./stack-setup.md) — checklist through Phase 13+
- [database-setup.md](./database-setup.md) — schema, seed, demo users

---

## 4. Application features (Phases 6–11)

| Phase | Feature | Phase doc |
|------:|---------|-----------|
| 6 | Auth, roles, navigation | [phase-06-foundation.md](./phases/phase-06-foundation.md) |
| 7 | Clients CRUD + isolation | [phase-07-clients.md](./phases/phase-07-clients.md) |
| 8 | Conversations & chat | [phase-08-conversations.md](./phases/phase-08-conversations.md) |
| 9 | Deals & pipeline | [phase-09-deals.md](./phases/phase-09-deals.md) |
| 10 | Manager dashboard | [phase-10-dashboard.md](./phases/phase-10-dashboard.md) |
| 11 | Polish, CORS, Vitest, eval smoke | [phase-11-polish.md](./phases/phase-11-polish.md) |

Build order and verify commands: [build-plan.md](./build-plan.md).

---

## 5. Tooling authentication (Phase 12)

Scripts and setup use a shared ladder: already authed → `process.env` → dotenv files → OAuth (desktop only). When **`CI=true`**, OAuth is skipped and scripts fail fast with env instructions.

Full reference: [external-auth.md](./external-auth.md). Cloudflare-specific: [cloudflare-auth.md](./cloudflare-auth.md).

**App login** (demo users) is separate — Supabase Auth in the browser, not Wrangler/`gh`.

---

## 6. Roles & API summary

| Role | Capabilities (high level) |
|------|---------------------------|
| **client** | Own profile, own threads/messages, own deals (read) |
| **sales** | Clients, conversations (assign/reply), own deals + pipeline |
| **manager** | All of the above + reassign owners, dashboard, any deal stage |

Protected routes return `401` without JWT, `403` when role forbids action. Critical constraints are covered by `API-*` Playwright tests — see [testing-guide.md](./testing-guide.md).

Main routes: `/api/me`, `/api/clients`, `/api/conversations`, `/api/deals`, `/api/dashboard`, `/api/health`.

---

## 7. Local development

See **[development-guide.md](./development-guide.md)** for daily workflow, feature checklist, and when to add or update tests.

```bash
npm run dev              # :5173
cd worker && npm run dev   # :8787
```

Env: `.env` + `worker/.dev.vars` (or exported vars). Seed: `npm run db:schema && npm run db:seed`.

Demo users: `manager1@demo.local` / `demo1234` (see [README](../README.md#demo-users)).

---

## 8. Testing

| Need | Doc |
|------|-----|
| Human catalog + how to add tests | [testing-guide.md](./testing-guide.md) |
| ID matrix & security table | [testing-plan.md](./testing-plan.md) |
| E2E artifacts | [e2e-artifacts.md](./e2e-artifacts.md) |
| WSL Playwright | [playwright-wsl-setup.md](./playwright-wsl-setup.md) |

**Counts:** 50 E2E/API Playwright tests + 8 Worker Vitest tests.

Commands: `npm run test:e2e`, `npm run test:e2e:dev`, `npm run test:worker`.

---

## 9. Evaluation checklist mapping

| Requirement | Evidence |
|-------------|----------|
| Supabase Auth | AUTH-* tests, all role logins |
| Client chat | EVAL-01, CHAT-* |
| Sales assign/reply | EVAL-02, CHAT-03–05 |
| Manager reassign | EVAL-03, CHAT-06 |
| Deals & pipeline | EVAL-04, DEAL-*, PIPE-* |
| Manager dashboard | EVAL-05, DASH-* |
| Backend authorization | API-* rows in testing-guide |

Run smoke: `npm run test:e2e -- --grep @smoke`.

---

## 10. Deployment

Stub until Phase 14: [deploy-guide.md](./deploy-guide.md). Production URLs will be added to README after deploy.

---

## 11. CI (deferred)

GitHub Actions workflow not checked in yet. Recipe for isolated E2E in CI: [ci-e2e-recipe.md](./ci-e2e-recipe.md). Use `CI=true` and inject secrets per [external-auth.md](./external-auth.md).

Optional: `npm run verify:github-actions`.

---

## 12. Roadmap

Post-MVP and deferred work: [roadmap.md](./roadmap.md).

---

## 13. Troubleshooting

| Symptom | Try |
|---------|-----|
| `ECONNREFUSED :8787` | Start `cd worker && npm run dev` |
| `ECONNREFUSED :5173` | Start `npm run dev` |
| E2E fails after reboot | Dev servers not running; or run isolated `test:e2e` |
| `nvm` / `npm_config_prefix` | [quick-start.md](./quick-start.md) troubleshooting |
| Cloudflare whoami fails | Token permissions + `CLOUDFLARE_ACCOUNT_ID`; see [cloudflare-auth.md](./cloudflare-auth.md) |
| OAuth hang in CI | Set `CI=true` and env tokens — no browser login |
| Playwright browsers missing | `npm run playwright:install` |
| WSL browser deps | [playwright-wsl-setup.md](./playwright-wsl-setup.md) |

Stack verify: `npm run verify:stack:local`, `verify:stack:cloud`, `verify:stack:supabase`.
