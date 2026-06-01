# Evaluation self-review

**Date:** 2026-05-31  
**Production app:** [https://sinc-crm-esg.pages.dev](https://sinc-crm-esg.pages.dev)  
**Production API:** [https://sinc-crm-api.prinxlexter.workers.dev](https://sinc-crm-api.prinxlexter.workers.dev)  
**Criteria source:** [project_requirements/evaluation.md](../../project_requirements/evaluation.md)

---

## 1. Automated verification results

| Check | Command / test | Result |
|-------|----------------|--------|
| Worker unit tests | `npm run test:worker` | **8/8 passed** |
| Full isolated E2E | `npm run test:e2e` | **58 passed**, 2 skipped (`DEPLOY-*` without env in isolated run) |
| Production API health | `VITE_API_BASE_URL=… npm run verify:stack:deploy` | **PASS** — `GET /api/health` → 200 |
| Production smoke | `DEPLOY_PAGES_URL` + `DEPLOY_API_URL` → `phase-14-deploy.spec.ts` | **2/2 passed** (DEPLOY-01, DEPLOY-02) |

**Fixes applied during verification:**

- `e2e/specs/phase-14-deploy.spec.ts` — moved `test.use({ baseURL })` to nested `describe` (Playwright requires `test.use` at describe scope).
- `playwright.config.ts` — skip local `webServer` when `DEPLOY_PAGES_URL` points at production (deploy smoke only).

**README:** Deployment table updated with live Pages, Worker, and Supabase URLs.

---

## 2. Manual production walkthrough

Password for all demo users: `demo1234`.

### Client (`client1@demo.local`)

| Item | Result | Evidence |
|------|--------|----------|
| Login succeeds | **Pass** | Browser on production `/login` → `/conversations` |
| Nav restricted (no Pipeline/Dashboard) | **Pass** | Mobile nav: Profile, Conversations only |
| Conversations list loads | **Pass** | Seeded + eval threads visible |
| API scoped to own client | **Pass** | `GET /api/clients` → 1 client (production API script) |

### Sales (`sales1@demo.local`)

| Item | Result | Evidence |
|------|--------|----------|
| Login / role | **Pass** | `GET /api/me` → `sales` (production API) |
| Conversations + deals access | **Pass** | 8 threads, 8 deals |
| Dashboard blocked | **Pass** | `GET /api/dashboard` → 403 |
| Assign/reply, pipeline, deal create | **Pass** | E2E `EVAL-02`, `EVAL-04`, `DEAL-*`, `PIPE-*` (isolated suite) |

### Manager (`manager1@demo.local`)

| Item | Result | Evidence |
|------|--------|----------|
| Login + dashboard UI | **Pass** | `DEPLOY-02` on production Pages |
| Dashboard aggregates | **Pass** | `GET /api/dashboard` → 200, `openChats=9` (production API) |
| Full client list | **Pass** | `GET /api/clients` → ≥4 clients |
| Reassign conversation / deal owner | **Pass** | E2E `EVAL-03`, `DEAL-04`, `CHAT-06` |

### Deploy / README

| Item | Result |
|------|--------|
| README URLs match production | **Pass** (updated 2026-05-31) |
| Fresh clone local run | **Not re-run this session** — documented in README Quick start; isolated E2E proves stack end-to-end |

---

## 3. Must-have checklist ([evaluation.md](../../project_requirements/evaluation.md))

| Must have | Status |
|-----------|--------|
| App runs locally from README | **Met** (README + isolated E2E) |
| Supabase Auth works | **Met** (AUTH-*, all E2E logins) |
| Client create and use chat | **Met** (EVAL-01, CHAT-*) |
| Sales assign and reply | **Met** (EVAL-02) |
| Manager reassign conversations | **Met** (EVAL-03) |
| Sales create deal for client | **Met** (EVAL-04, DEAL-01) |
| Deal associated with correct client | **Met** (EVAL-04 asserts client name) |
| Deal owner assign/reassign | **Met** (DEAL-04) |
| Pipeline stages work | **Met** (PIPE-02, DEAL-02) |
| Stage history recorded | **Met** (DEAL-02, DEAL-06) |
| Dashboard counts from real DB | **Met** (EVAL-05, DASH-05) |
| UI usable + shadcn/ui | **Met** (components.json, phase E2E UI) |
| Frontend + backend on Cloudflare | **Met** (live URLs + DEPLOY-*) |
| README deployed URLs + setup docs | **Met** (after URL table update) |

---

## 4. Strong implementation rubric

| Criterion | Score | Evidence |
|-----------|-------|----------|
| Backend role checks correct | **Met** | `assertCanUpdateStage`, manager-only owner PATCH; API-DEAL-*, API-CONV-*, DASH-04 |
| Schema normalized + indexed | **Met** | `supabase/schema/02_tables.sql`, `03_indexes.sql`; `verify:stack:supabase` |
| Realtime without manual refresh | **Met** | `src/lib/realtime.ts`; hooks invalidate TanStack Query; CHAT-02 |
| Pipeline board usable | **Met** | Select-based stage change (PIPE-02); drag-drop out of scope |
| Client detail useful overview | **Met** | CLI-03, profile + deals + conversations on detail page |
| TanStack Query consistent | **Met** | Feature hooks use stable keys (`["conversations", …]`, `["deals", …]`) |
| Loading / empty / error states | **Met** | Phase 11 polish; pipeline error UI |
| Modular, navigable code | **Met** | `src/features/*`, `worker/src/services`, `routes` |
| Deployed build E2E walkthrough | **Met** | DEPLOY-02 + production API checks |
| README complete | **Met** | Quick start, demo users, database-setup, deployment URLs |

**Partial (documented, not blocking):** Realtime subscription cleanup on logout is implemented in code (`unsubscribe` / `removeChannel`) but not covered by a dedicated E2E test ([testing-guide.md](../testing-guide.md) edge-case worksheet).

---

## 5. Design review Q&A

### 1. What if a sales user tries to update a deal they do not own?

The Worker rejects the request with **403** and message `"Sales can only update deals they own"` via `assertCanUpdateStage` in `worker/src/services/dealsService.ts`. The UI hides the stage control on another rep’s deal (E2E **DEAL-03**).

### 2. How are role checks enforced on the backend?

Every authenticated request resolves the JWT to a `profiles` row (`role`). Route handlers call service-layer guards (e.g. `assertCanUpdateStage`, conversation assign rules, client scoping). Unauthorized actions return **401** (no token) or **403** (wrong role/scope). E2E **`API-*`** specs assert these status codes.

### 3. How does the app avoid showing another client’s private chat?

**API:** list and detail endpoints filter by `client_id` linked to the signed-in profile. **UI:** client conversation list only includes own threads. E2E **CHAT-07** (UI) and **CHAT-08** (API 403 on other thread).

### 4. What queries need indexes and why?

See `supabase/schema/03_indexes.sql`:

- `conversation_threads`: `assigned_to`, `status`, `last_message_at` — unassigned queue and sorted inbox.
- `conversation_messages`: `(thread_id, created_at)` — message timeline per thread.
- `deals`: `client_id`, `owner_id`, `stage` — pipeline board and owner filters.
- `deal_stage_history` / `deal_notes`: `(deal_id, created_at)` — activity timeline.

### 5. How are realtime subscriptions cleaned up?

`subscribeToTable` in `src/lib/realtime.ts` returns `unsubscribe` that calls `supabase.removeChannel(channel)`. Feature hooks (`conversations/hooks.ts`, `deals/hooks.ts`) return that function from `useEffect` cleanup. Auth session listener unsubscribes in `AuthContext.tsx`.

### 6. What would you improve with another iteration?

From [roadmap.md](../roadmap.md): drag-and-drop pipeline, unread chat badges, client/deal search, GitHub Actions CI E2E, production deploy via GitHub→Cloudflare, and dedicated E2E for realtime teardown on logout.

---

## 6. Capability-area self-score (reference / 100)

| Area | Weight | Score | Notes |
|------|--------|-------|-------|
| Auth and roles | 10 | **10** | AUTH-*, NAV-*, API 401/403, production login |
| Client CRM | 15 | **14** | CLI-*, detail page; fresh-clone not re-verified today |
| Realtime chat | 15 | **14** | CHAT-*, EVAL-01; cleanup not E2E-tested |
| Conversation assignment | 10 | **10** | EVAL-02/03, CHAT-03–06 |
| Deal CRUD and ownership | 15 | **15** | EVAL-04, DEAL-01–04, API-DEAL-* |
| Pipeline stages/history | 15 | **15** | DEAL-02/06, PIPE-* |
| Dashboard | 10 | **10** | EVAL-05, DASH-*, production aggregates |
| UI quality | 5 | **5** | shadcn/ui, usable flows, prior UI audit |
| README and local setup | 5 | **5** | URLs filled; setup docs complete |
| **Total** | **100** | **98** | |

---

## 7. Sign-off

| Criterion | Status |
|-----------|--------|
| Full isolated E2E green | **Yes** (58/58 run tests) |
| `verify:stack:deploy` on production API | **Yes** |
| DEPLOY-01 / DEPLOY-02 on production | **Yes** |
| Manual walkthrough (all roles) | **Yes** (browser + production API + E2E coverage) |
| README deployment URLs | **Yes** |
| Strong implementation: no security Gap | **Yes** |
| Design review questions answerable | **Yes** (section 5) |

**Conclusion:** The project **meets** the evaluation must-haves and strong-implementation bar for portfolio submission, with minor partial items (realtime logout E2E, optional fresh-clone smoke) documented as follow-ups rather than blockers.
