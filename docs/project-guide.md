[← Back to README — Documentation](../README.md#documentation)

# Project guide

Long-form reference for contributors and maintainers. Short onboarding: [README.md](../README.md).

---

## 1. Overview

**SINC Student CRM** — multi-role CRM with conversations (chat), deal pipeline, and manager analytics. Stack: React SPA (Vite), Cloudflare Worker API (Hono), Supabase (Postgres + Auth + Realtime).

Product goals and acceptance criteria: [project_requirements/](../project_requirements/) especially [evaluation.md](../project_requirements/evaluation.md).

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

## 3. Setup & infrastructure

Install, env files, schema, and seed:

- [quick-start.md](./quick-start.md) — canonical scripted setup
- [stack-setup.md](./stack-setup.md) — verify commands and installers
- [infrastructure-phases.md](./infrastructure-phases.md) — phases 1–5 summary
- [database-setup.md](./database-setup.md) — schema, seed, demo users

---

## 4. Application features

Auth, clients, conversations, deals, pipeline, dashboard, and polish are implemented. Specs and behavior:

- Product requirements: [project_requirements/](../project_requirements/)
- API: [api/openapi.yaml](./api/openapi.yaml)
- Tests: [testing-guide.md](./testing-guide.md)

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
| **sales** | Reads all clients/conversations/deals; creates clients/deals; replies when assigned; updates own deal stages; adds notes |
| **manager** | Read-all, dashboard, reassign owners/assignees, move any deal stage; no create/reply/note writes |

Protected routes return `401` without JWT, `403` when role forbids action. Critical constraints are covered by `API-*` Playwright tests — see [testing-guide.md](./testing-guide.md).

**Full API reference:** [api/openapi.yaml](./api/openapi.yaml) (OpenAPI 3.1 — all routes, request/response schemas, role permissions via `x-permissions`, and examples). Interactive viewer: [api/index.html](./api/index.html) (run `npx serve docs/api` locally). Auth overview: [api/authentication.md](./api/authentication.md).

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

**Counts:** 60 Playwright tests + Worker Vitest + tooling auth tests (`npm run test:scripts`).

Commands: `npm run test:e2e`, `npm run test:e2e:dev`, `npm run test:worker`.

---

## 9. Acceptance criteria mapping

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

Deploy: [deploy-guide.md](./deploy-guide.md) — **two-pass manual procedure** (Pass 1: schema/worker/pages; Pass 2: CORS secret + Supabase Auth URLs). Optional `db:seed` for demo logins only.

**How we deploy today:** Wrangler CLI (`npm run deploy:worker`, `deploy:pages`) with a Cloudflare API token.

**Also valid (not wired in this repo yet):** GitHub push → Cloudflare Pages build, plus GitHub Actions for Worker secrets and deploy. We plan to support **both** CLI and CI paths; use the deploy guide’s CLI steps for now.

Record production URLs in [README](../README.md#deployment) after deploy. A future two-pass automation script is planned after manual deploy is verified.

---

## 11. CI (deferred)

GitHub Actions workflow not checked in yet. Recipe for isolated **E2E** in CI: [ci-e2e-recipe.md](./ci-e2e-recipe.md) (testing, separate from production deploy). Use `CI=true` and inject secrets per [external-auth.md](./external-auth.md). Production deploy via Actions is described as a future option in [deploy-guide.md](./deploy-guide.md).

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
