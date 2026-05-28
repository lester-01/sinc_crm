# Stack Setup Guide — Student CRM

Setup checklist, **build-phase todo**, and verification commands. Use this file to track what is done and what is next.

**Build phases 6–14:** [build-plan.md](./build-plan.md)  
**Automated tests (E2E + API):** [testing-plan.md](./testing-plan.md)  
**Per-phase implementation notes:** [phases/README.md](./phases/README.md)

Related: [project_requirements/README.md](../project_requirements/README.md), [project_requirements/architecture.md](../project_requirements/architecture.md), [quick-start.md](./quick-start.md)

---

## Setup checklist — infrastructure (complete)

### Phase 1 — Local tools (complete)

- [x] **Node.js 22+** installed (`node -v` shows v22+)
- [x] **npm** available (`npm -v`)
- [x] **Git** installed (`git --version`)
- [x] Run **`npm run install:linux`** (WSL/Linux) or [quick-start.md](./quick-start.md) on Windows
- [x] Run: `npm run verify:stack:local` — all checks pass

After `install:linux`, **restart the terminal** or run `source ~/.bashrc` — see [quick-start.md](./quick-start.md).

### Phase 2 — Backend scaffold (`worker/`) (complete)

- [x] Run **`npm run setup:worker`**
- [x] Hono API per [architecture.md](../project_requirements/architecture.md)
- [x] `cd worker && npm run dev` — `GET http://localhost:8787/api/health`
- [x] `npm run verify:stack:scaffold` — worker checks pass

### Phase 3 — Frontend scaffold (root `src/`) (complete)

- [x] Run **`npm run setup:frontend`** — Vite, React, TypeScript, Router, TanStack Query, Tailwind, shadcn base
- [x] Layout matches [architecture.md](../project_requirements/architecture.md) (`src/app`, `src/pages`, `src/lib`, `src/features`, `src/components`)
- [x] Manual **`supabaseClient.ts`** + **`apiClient.ts`** (no Supabase shadcn registry)
- [x] `npm run dev` — Vite on `http://localhost:5173`
- [x] `npm run verify:stack:scaffold` — frontend checks pass

### Phase 4 — Cloud accounts + credentials (complete)

Merged former phases 4 and 5. **Installers do not copy env files** — you copy examples and paste keys first.

- [x] **GitHub** public repo; remote `origin` configured
- [x] **Supabase** project created ([dashboard](https://supabase.com/dashboard))
- [x] **Cloudflare** account created; scoped API token in `worker/.cloudflare.env`
- [x] Copy env examples (see [quick-start.md](./quick-start.md) — Environment files):
  - [x] `.env.example` → `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`)
  - [x] `worker/.dev.vars.example` → `worker/.dev.vars` (`SUPABASE_SECRET_KEY`)
  - [x] `worker/.cloudflare.env.example` → `worker/.cloudflare.env`
- [x] Paste Supabase + Cloudflare keys into those files
- [x] Run **`npm run verify:stack:cloud`** — all checks pass

Cloudflare: **scoped API token only** for setup/verify. OAuth/`wrangler login` is deprecated ([cloudflare-auth.md](./cloudflare-auth.md)).

### Phase 5 — Supabase database (complete)

- [x] SQL schema + indexes — `supabase/schema/` ([database.md](../project_requirements/database.md))
- [x] RLS + Realtime publication + profile bootstrap trigger
- [x] Auth: disable email confirmation for demo ([database-setup.md](./database-setup.md))
- [x] Seeds: 2 managers, 3 sales, 4 clients (`npm run db:seed`)
- [x] Run: `npm run verify:stack:supabase`

**Guide:** [database-setup.md](./database-setup.md) · **Future work:** [roadmap.md](./roadmap.md)

```bash
npm run db:schema    # empty DB only — needs SUPABASE_DB_URL (transaction pooler) in worker/.dev.vars
npm run db:seed
npm run verify:stack:supabase
```

---

## Build todo — application (Phases 6–14)

**Approach:** Vertical slices per [build-plan.md](./build-plan.md) (wireframes + API + tests each phase).  
**Tests (now):** Local Playwright **UI mode** (`test:e2e:ui`) as each phase lands — see [testing-plan.md](./testing-plan.md).  
**CI / GitHub Actions:** deferred until the CI stage — [ci-e2e-recipe.md](./ci-e2e-recipe.md) only.  
**Docs:** Update the matching file under [phases/](./phases/) as you complete each phase.

**Prerequisite:** Playwright browsers installed on your machine ([playwright-wsl-setup.md](./playwright-wsl-setup.md)). Phase 6 adds the repo harness (`e2e/`, npm scripts).

### Phase 6 — App foundation (complete)

- [x] Isolated E2E: `e2e-run.mjs` (create `sinc-ci-e2e-*` → seed → test → artifacts → delete)
- [x] Playwright + `test:e2e` / `test:e2e:ui` / `test:e2e:dev` — [e2e-artifacts.md](./e2e-artifacts.md)
- [x] **E2E only:** `SUPABASE_ACCESS_TOKEN` + `SUPABASE_ORG_SLUG` in `worker/.dev.vars`
- [x] Playwright in repo (`@playwright/test`) — run `npm run verify:playwright`, then `sudo npx playwright install-deps chromium` if launch fails
- [x] Login/sign-up, auth session, protected routes, role-aware shell
- [x] shadcn: input, label, card, dropdown-menu
- [x] Tests `AUTH-*`, `NAV-*` in `e2e/specs/phase-06-auth.spec.ts`
- [x] Phase doc: [phases/phase-06-foundation.md](./phases/phase-06-foundation.md)

### Phase 7 — Clients (current)

- [ ] Worker clients routes + service + zod
- [ ] ClientsPage + ClientDetailPage + `src/features/clients/`
- [ ] Tests `CLI-*`, `API-CLI-*`
- [ ] Phase doc: [phases/phase-07-clients.md](./phases/phase-07-clients.md)

### Phase 8 — Conversations & chat

- [ ] Worker conversations/messages + assignment rules
- [ ] ConversationPage + Realtime in `realtime.ts`
- [ ] Tests `CHAT-*`, `API-CONV-*` (including chat privacy)
- [ ] Phase doc: [phases/phase-08-conversations.md](./phases/phase-08-conversations.md)

### Phase 9 — Deals & pipeline

- [ ] Worker deals routes + stage history + notes
- [ ] PipelinePage + DealDetailPage (Select stage, no drag-drop)
- [ ] Tests `DEAL-*`, `PIPE-*`, `API-DEAL-*`
- [ ] Phase doc: [phases/phase-09-deals.md](./phases/phase-09-deals.md)

### Phase 10 — Dashboard

- [ ] Worker `GET /api/dashboard`
- [ ] DashboardPage (manager only)
- [ ] Tests `DASH-*`
- [ ] Phase doc: [phases/phase-10-dashboard.md](./phases/phase-10-dashboard.md)

### Phase 11 — Polish & full regression

- [ ] Loading / empty / error states
- [ ] Full E2E suite + evaluation smoke (`EVAL-*`)
- [ ] Phase doc: [phases/phase-11-polish.md](./phases/phase-11-polish.md)

### Phase 12 — README & doc compile

- [ ] Short root `README.md` (setup + run tests only)
- [ ] Full [project-guide.md](./project-guide.md) compiled from phase docs
- [ ] `docs/README.md` index
- [ ] Phase doc: [phases/phase-12-readme.md](./phases/phase-12-readme.md)

### Phase 13 — Deploy

- [ ] Cloudflare Worker + Pages; production env
- [ ] `npm run verify:stack:deploy`
- [ ] Optional deploy smoke tests (`DEPLOY-*`)
- [ ] Phase doc: [phases/phase-13-deploy.md](./phases/phase-13-deploy.md)

### Phase 14 — Submission

- [ ] Video demo + Google Form + review meeting
- [ ] README lists deployed URLs
- [ ] Phase doc: [phases/phase-14-submission.md](./phases/phase-14-submission.md)

### Optional — GitHub Actions readiness (anytime)

- [ ] Run `npm run verify:github-actions` — checks if connected `origin` can likely run workflows (not required for dev)

### Deferred — GitHub Actions CI (after local E2E stable)

- [ ] `.github/workflows/e2e.yml` — calls same `e2e-run.mjs` as local (headless)
- [ ] Upload `test-results/<session>/` artifact
- [ ] Document CI secrets in [project-guide.md](./project-guide.md)

Orchestrator + isolated DB runs are built in **Phase 6**; only the workflow file is deferred.

---

## Installers

| Command | Purpose |
|---------|---------|
| `npm run install:linux` | Phase 1: nvm, Node 22, wrangler + supabase CLI |
| `npm run setup:local` | Phase 1 CLIs only |
| `npm run setup:worker` | Phase 2: Worker runtime packages |
| `npm run setup:frontend` | Phase 3: Vite/React packages at repo root |
| `npm run setup:cloud` | **Phase 4:** env check, Cloudflare auth, `verify:stack:cloud` |
| `npm run db:schema` | **Phase 5:** apply schema SQL (empty DB) |
| `npm run db:seed` | **Phase 5:** demo users + CRM data (empty DB) |
| `npm run install:project` | Master — `local`, `worker`, `frontend` (default; no env copy) |
| `npm run test:e2e` | **Phase 6+:** Playwright (added with harness) |
| `npm run test:worker` | **Phase 6+:** Vitest in `worker/` (added with services) |

Override phases: `INSTALL_PROJECT_PHASES=local,worker npm run install:project`

Skip cloud verify while filling keys: `SKIP_CLOUD_VERIFY=1 npm run setup:cloud`

---

## Architecture (repo layout)

Per [architecture.md](../project_requirements/architecture.md) — **no `frontend/` wrapper**:

```txt
src/                       # Phase 3 — Vite + React SPA
  app/                     router.tsx, queryClient.ts
  components/              layout/, ui/
  features/                auth/, clients/, conversations/, deals/, dashboard/
  lib/                     apiClient.ts, supabaseClient.ts, realtime.ts
  pages/                   LoginPage, DashboardPage, …

worker/                    # Phase 2 — Hono API at /api
  src/                     …

e2e/                       # Phase 6+ — Playwright specs (planned)
```

**Data flow:** CRM HTTP via **Worker** + TanStack Query; **Supabase client** for Auth + Realtime only.

---

## Verification tests

```bash
npm run verify:stack:scaffold
npm run verify:stack:local
npm run verify:stack:cloud      # Phase 4 — env + GitHub + Cloudflare + Supabase keys
npm run verify:stack:supabase   # Phase 5 — schema + tables
npm run dev                   # frontend :5173
cd worker && npm run dev      # API :8787
npm run test:e2e              # Phase 6+ — isolated E2E (needs E2E-only Supabase token vars)
npm run verify:github-actions # optional — GitHub Actions readiness on origin remote
```

**Infrastructure (Phases 1–5):** complete.  
**Current focus:** Phase 7 — [build-plan.md](./build-plan.md) · [phases/phase-07-clients.md](./phases/phase-07-clients.md) (create when starting)

---

## Cost

| Provider | MVP |
|----------|-----|
| Supabase Free | $0 |
| Cloudflare Free | $0 |
| GitHub public | $0 |
