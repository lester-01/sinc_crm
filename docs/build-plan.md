# Build plan — Phases 6–14

Master plan for implementing the SINC Student CRM after infrastructure (Phases 1–5) is complete.

**Status:** Approved — vertical slices; **local E2E in UI mode** as we go; GitHub Actions only in CI stage; phase docs maintained as we go.

**Ready:** Playwright browsers on dev machine; E2E Supabase token + `SUPABASE_ORG_SLUG` in `worker/.dev.vars`.

Related:

- Setup checklist & todo: [stack-setup.md](./stack-setup.md)
- Test catalog: [testing-plan.md](./testing-plan.md)
- Wireframes: [project_requirements/ui-wireframes.md](../project_requirements/ui-wireframes.md)
- API: [project_requirements/api.md](../project_requirements/api.md)
- Evaluation: [project_requirements/evaluation.md](../project_requirements/evaluation.md)

---

## How we build

### Vertical slices (not UI-only, not API-only)

For each phase:

1. Implement **Worker routes + services** with role checks and zod validation.
2. Implement **frontend feature** (`src/features/<domain>/`) and page UI matching [ui-wireframes.md](../project_requirements/ui-wireframes.md).
3. Wire **TanStack Query** to the Worker; use Supabase client only for **Auth + Realtime**.
4. Add **tests** listed for that phase in [testing-plan.md](./testing-plan.md).
5. Write **`docs/phases/phase-NN-<slug>.md`** using [phases/_template.md](./phases/_template.md).

Improve wireframes where the spec is clearer (e.g. all eight pipeline stages, client-reduced navigation).

### Documentation workflow

| When | What |
|------|------|
| Start of phase | Create `docs/phases/phase-NN-<slug>.md` from template; link from [phases/README.md](./phases/README.md) |
| During phase | Record decisions, endpoints, constraints, test IDs added |
| End of phase | Mark phase complete in [stack-setup.md](./stack-setup.md); run phase verify + relevant tests |
| After Phase 12 | Compile phase docs into [project-guide.md](./project-guide.md) |
| README | Short: clone, env, dev, **run tests** — see Phase 12 |

Phase docs are the **source of truth** for implementation detail. **README** stays minimal; **project-guide.md** holds the full story.

### Tools (local vs CI)

| Tool | Use |
|------|-----|
| **Playwright (local)** | **Primary during build** — `npm run test:e2e` on your machine |
| **Playwright (CI)** | **Later** — [ci-e2e-recipe.md](./ci-e2e-recipe.md), ephemeral `sinc-ci-e2e-*` Supabase projects |
| **Vitest** (Worker) | Fast unit tests for services, validators, role helpers |
| **Stack verify scripts** | `npm run verify:stack:*` — env, schema, deploy smoke |
| **cursor-ide-browser MCP** | Optional visual debugging — **does not run** Playwright specs |
| **Supabase MCP** | Optional SQL/advisors during dev — **not** required for tests |
| **shadcn MCP** | Add UI components per wireframe list |

---

## Phase overview

| Phase | Name | Primary deliverable | Phase doc (created when started) |
|------:|------|---------------------|----------------------------------|
| 6 | App foundation | Login, session, protected routes, wireframe shell | `phase-06-foundation.md` |
| 7 | Clients | Clients API + list/detail UI | `phase-07-clients.md` |
| 8 | Conversations & chat | Chat API + workspace UI + Realtime | `phase-08-conversations.md` |
| 9 | Deals & pipeline | Deals API + pipeline + deal detail + history | `phase-09-deals.md` |
| 10 | Dashboard | Manager metrics API + UI | `phase-10-dashboard.md` |
| 11 | Polish & regression | UX states, evaluation walkthrough, full test suite green | `phase-11-polish.md` |
| 12 | README & docs compile | Root README, doc index | `phase-12-readme.md` |
| 13 | Deploy | Cloudflare Pages + Worker | `phase-13-deploy.md` |
| 14 | Submission | Video, form, meeting | `phase-14-submission.md` |

**Test harness bootstrap** happens at the **start of Phase 6** (Playwright local only, `e2e/` layout). **No GitHub Actions yet** — see deferred item in [stack-setup.md](./stack-setup.md). See [testing-plan.md](./testing-plan.md).

---

## Phase 6 — App foundation

**Goal:** Sign in with seeded users; role-aware shell; route protection.

### Tasks

- [ ] Isolated E2E orchestrator (`e2e-run.mjs`: create `sinc-ci-e2e-*` → seed → test → artifacts → delete)
- [x] Playwright + `test:e2e` / `test:e2e:dev` (headless); optional `test:e2e:ui`; artifact layout per [e2e-artifacts.md](./e2e-artifacts.md)
- [ ] `SUPABASE_ACCESS_TOKEN` + `SUPABASE_ORG_SLUG` in `.dev.vars.example`; `npx playwright install chromium` once
- [ ] Login/sign-up: email + password inputs, submit, error display
- [ ] Client signup with `role: client` user metadata
- [ ] Auth context / session listener; persist session
- [ ] Protected routes + redirect to `/login`
- [ ] App shell per wireframe: nav, user menu, sign out; role-filtered nav items
- [ ] Install shadcn components from wireframe list (Card, Input, Badge, …)
- [ ] Phase doc + tests: `AUTH-*`, `NAV-*` (testing plan)

### Verify

```bash
npm run dev
cd worker && npm run dev
# Manual: manager1@demo.local / demo1234 → dashboard nav visible for manager
# npm run test:e2e -- --grep @phase6
```

---

## Phase 7 — Clients

**Goal:** CRM client list, create, detail; role-scoped access.

### Tasks

- [x] Worker: `GET/POST /api/clients`, `GET /api/clients/:id` + `clientsService` + zod
- [x] `src/features/clients/` hooks
- [x] ClientsPage (table, search, New Client dialog)
- [x] ClientDetailPage (profile, conversation/deal panels, activity)
- [x] Phase doc + tests: `CLI-*`, `API-CLI-*`

### Verify

- Sales creates client; manager sees all; client sees only own profile.
- E2E: Phase 7 tests green.

---

## Phase 8 — Conversations & realtime chat

**Goal:** Assessment-critical chat, assign, reassign; privacy between clients.

### Tasks

- [x] Worker: conversations + messages routes; `last_message_at` on send
- [x] Assign/reassign/status; manager vs sales rules
- [x] ConversationPage (queue + thread + tabs)
- [x] `src/lib/realtime.ts` subscriptions + query invalidation
- [x] New chat from client detail
- [x] Phase doc + tests: `CHAT-*`, `API-CONV-*` (include **client A cannot see client B messages**)

### Verify

- Evaluation flows: client chat, sales assign/reply, manager reassign.
- Realtime or invalidation updates UI without manual refresh.

---

## Phase 9 — Deals & pipeline

**Goal:** Deal CRUD, ownership, static pipeline, stage history, notes.

### Tasks

- [x] Worker: deals routes; `deal_stage_history` on stage change; lost reason
- [x] PipelinePage: 8 columns, Select stage change (no drag-drop)
- [x] DealDetailPage: notes, history, reassign owner
- [x] New deal from client; client active-deal summary
- [x] Realtime invalidation for pipeline/deal
- [x] Phase doc + tests: `DEAL-*`, `API-DEAL-*`, `PIPE-*`

### Verify

- Sales moves **owned** deal; blocked on others’ deals.
- Manager reassigns owner; history rows exist.

---

## Phase 10 — Manager dashboard

**Goal:** Real DB aggregates.

### Tasks

- [x] Worker: `GET /api/dashboard`
- [x] DashboardPage per wireframe
- [x] Manager-only route + API guard
- [x] Phase doc + tests: `DASH-*`

### Verify

- Counts match seeded data; sales/client get 403 or hidden UI.

---

## Phase 11 — Polish & full regression

**Goal:** Pass evaluation checklist; CI-ready test suite.

### Tasks

- [ ] Loading / empty / error on all major queries
- [ ] TanStack Query key consistency
- [ ] Client-simplified experience
- [ ] CORS origins for production
- [ ] Run full `npm run test:e2e` + `npm run test:worker` (when added)
- [ ] Phase doc: evaluation mapping table

### Verify

- Walk [evaluation.md](../project_requirements/evaluation.md) “Required To Pass” locally.
- All tests in [testing-plan.md](./testing-plan.md) implemented or explicitly deferred with reason.

---

## Phase 12 — README & documentation compile

**Goal:** Assessor-ready repo documentation.

### Tasks

- [ ] Root **`README.md`** — short: clone, env, `npm run dev`, `db:schema`/`db:seed`, demo users, **`npm run test:e2e`**
- [ ] **`docs/project-guide.md`** — full compile from phase docs
- [ ] `docs/README.md` index

### Verify

- Fresh clone instructions work (documented assumption: empty DB + seed).

---

## Phase 13 — Deploy

**Goal:** Production URLs in README.

### Tasks

- [ ] Deploy Worker; secrets
- [ ] Deploy Pages; `VITE_API_BASE_URL`
- [ ] Supabase Auth redirect URLs
- [ ] `npm run verify:stack:deploy`
- [ ] Phase doc: production env + URLs
- [ ] Optional: smoke E2E against deployed URL (`@deploy` tag)

### Verify

- Deployed app usable in video demo.

---

## Phase 14 — Submission

**Goal:** Complete assessment delivery.

### Tasks

- [ ] Demo video (deployed app, role flows)
- [ ] Google Form
- [ ] Review meeting booked
- [ ] Phase doc: submission checklist + links

---

## Assumptions

| Assumption | Value |
|------------|--------|
| E2E runs (local + CI) | **Isolated DB** each run: `sinc-ci-e2e-*` → seed → test → report → delete |
| Agent test command | `npm run test:e2e` or `test:e2e:dev -- --grep @phaseN` (headless) |
| CI workflow | **Deferred** — same `e2e-run.mjs`, headless; upload `test-results/` |
| CI prefix | **`sinc-ci-e2e-`** |
| Dev Supabase | App dev only; optional `test:e2e:dev` for fast iteration |
| Test password | `SEED_DEMO_PASSWORD` / `demo1234` |
| E2E stack | Playwright `webServer` starts Vite + Worker |
| Cursor browser | Not used to execute Playwright tests |
| README vs guide | README short; [project-guide.md](./project-guide.md) comprehensive |

---

## Deferred (unchanged)

See [roadmap.md](./roadmap.md): drag-drop pipeline, file upload, email verification for demo, etc.

---

## Next action

1. Confirm assumptions in **Assumptions** (reply if CI/test project differs).
2. Mark Phase 6 in progress in [stack-setup.md](./stack-setup.md).
3. Create `docs/phases/phase-06-foundation.md` and begin implementation.
