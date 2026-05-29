[← Back to README — Running tests](../README.md#running-tests)

# Testing guide

Human-readable catalog of automated tests, how to run them, and how to add new ones. Machine-oriented matrix: [testing-plan.md](./testing-plan.md).

---

## Test layers

| Layer | Tool | Command | What it proves |
|-------|------|---------|----------------|
| E2E UI + API | Playwright | `npm run test:e2e` | Login, nav, forms, chat, pipeline, dashboard |
| E2E (dev DB) | Playwright | `npm run test:e2e:dev` | Same specs against your existing `.env` (no project create/delete) |
| Worker unit | Vitest | `npm run test:worker` | Zod schemas, CORS helper, validation rules |
| Stack verify | Node scripts | `npm run verify:stack:*` | Env, schema, Cloudflare token — not business rules |

**Default E2E:** isolated run via `scripts/e2e-run.mjs` — creates `sinc-ci-e2e-*` Supabase project, seeds, runs tests, deletes project. Artifacts: [e2e-artifacts.md](./e2e-artifacts.md).

---

## Command reference

| Command | Use |
|---------|-----|
| `npm run test:e2e` | Full isolated suite, headless |
| `npm run test:e2e:ui` | Isolated + Playwright UI mode |
| `npm run test:e2e:dev` | Fast path: needs Vite `:5173` + Worker `:8787` + seeded dev DB |
| `npm run test:e2e:dev -- --grep @phase9` | Subset by phase tag |
| `npm run test:e2e -- --grep @smoke` | Evaluation smoke only |
| `npm run test:worker` | 8 Vitest tests in `worker/` |
| `npm run verify:stack:supabase` | Schema + tables present |

**E2E-only env** (isolated runs): `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_SLUG` in `worker/.dev.vars` or environment — see [external-auth.md](./external-auth.md).

**CI:** set `CI=true` and inject tokens; scripts fail fast before browser OAuth ([external-auth.md](./external-auth.md)).

---

## E2E catalog (50 tests)

Specs live under `e2e/specs/`. Tags: `@phase6` … `@phase11`, `@smoke` for evaluation paths.

### Phase 6 — Auth & navigation (`phase-06-auth.spec.ts`, 10 tests)

| ID | What it checks |
|----|----------------|
| AUTH-01 | Manager logs in; `/api/me` returns `manager` |
| AUTH-02 | Sales logs in; dashboard nav hidden |
| AUTH-03 | Client logs in; reduced nav |
| AUTH-04 | Wrong password shows error; stays on login |
| AUTH-05 | Logout clears session |
| AUTH-06 | `GET /api/clients` without token → `401` |
| AUTH-07 | `GET /api/me` without token → `401` |
| NAV-01 | Manager can reach Dashboard, Clients, Conversations, Pipeline |
| NAV-02 | Client does not see Pipeline/Dashboard |
| NAV-03 | Unauthenticated visit to `/clients` redirects to login |

### Phase 7 — Clients (`phase-07-clients.spec.ts`, 8 tests)

| ID | What it checks |
|----|----------------|
| CLI-01 | Manager sees seeded client list |
| CLI-02 | Sales creates a client |
| CLI-03 | Client sees own profile only |
| CLI-04 | Client cannot open another client’s record |
| API-CLI-01 | Client list API scoped to own client |
| API-CLI-02 | Client cannot `GET` another client’s id |
| API-CLI-03 | Sales can `POST /api/clients` |
| API-CLI-04 | Client cannot `POST /api/clients` |

### Phase 8 — Conversations (`phase-08-conversations.spec.ts`, 11 tests)

| ID | What it checks |
|----|----------------|
| CHAT-01 | Client starts a conversation |
| CHAT-02 | Client sends a message |
| CHAT-03 | Sales sees unassigned queue |
| CHAT-04 | Sales assigns thread to self |
| CHAT-05 | Sales reply visible in thread |
| CHAT-06 | Manager reassigns conversation owner |
| CHAT-07 | **Privacy:** client1 does not see client2’s thread in UI |
| CHAT-08 | **Privacy:** client1 API cannot read client2’s thread |
| CHAT-09 | Client can read own thread messages |
| API-CONV-01 | Sales assign API succeeds |
| API-CONV-02 | Forbidden assign returns `403` where applicable |

### Phase 9 — Deals & pipeline (`phase-09-deals.spec.ts`, 11 tests)

| ID | What it checks |
|----|----------------|
| DEAL-01 | Sales creates deal for client |
| DEAL-02 | Sales moves own deal stage |
| DEAL-03 | Sales cannot change another rep’s deal stage |
| DEAL-04 | Manager reassigns deal owner |
| DEAL-05 | Deal note appears on detail |
| DEAL-06 | Stage change adds `deal_stage_history` |
| DEAL-07 | `lost` stage requires `lostReason` |
| PIPE-01 | Pipeline shows all stage columns |
| PIPE-02 | Stage change via select updates card |
| API-DEAL-01 | Client cannot create deals |
| API-DEAL-02 | Manager can patch any deal stage |

### Phase 10 — Dashboard (`phase-10-dashboard.spec.ts`, 5 tests)

| ID | What it checks |
|----|----------------|
| DASH-01 | Manager dashboard UI loads metrics |
| DASH-02 | Sales cannot access dashboard route/nav |
| DASH-03 | Manager `GET /api/dashboard` → `200` |
| DASH-04 | Sales `GET /api/dashboard` → `403` |
| DASH-05 | Dashboard counts match seed thresholds |

### Phase 11 — Evaluation smoke (`phase-11-eval-smoke.spec.ts`, 5 tests, `@smoke`)

| ID | What it checks |
|----|----------------|
| EVAL-01 | End-to-end client chat path |
| EVAL-02 | Sales assign + reply path |
| EVAL-03 | Manager reassign path |
| EVAL-04 | Deal create + stage move path |
| EVAL-05 | Manager dashboard with real seed data |

---

## Worker unit tests (8 tests, Vitest)

| File | Coverage |
|------|----------|
| `worker/src/schemas/deals.test.ts` | Create deal body, `lost` + `lostReason`, note body, owner patch |
| `worker/src/lib/corsOrigins.test.ts` | Default dev origins, `CORS_ORIGINS` append |

Run: `npm run test:worker`.

---

## How to add a test

1. **Pick an ID** in [testing-plan.md](./testing-plan.md) (e.g. `CHAT-10`) or add a row there first.
2. **Choose layer** — E2E UI (`page`), E2E API (`request` fixture), or Vitest for pure logic.
3. **Open the phase spec** — e.g. `e2e/specs/phase-08-conversations.spec.ts`.
4. **Use helpers** — `e2e/fixtures/auth.ts`, `e2e/helpers/api.ts`; log steps with `[TEST-ID]` for artifacts.
5. **Tag the test** — `test('CHAT-10 …', { tag: ['@phase8'] }, …)`.
6. **Assert security** — use the constraint matrix in testing-plan (403/404, not only UI).
7. **Run targeted** — `npm run test:e2e:dev -- --grep CHAT-10` or `@phase8`.
8. **Update tracking** — bump “Implemented” counts in testing-plan if you add planned IDs.

Demo users and seed data: [database-setup.md](./database-setup.md). Password: `demo1234`.

---

## Edge-case worksheet

Pre-filled gaps from the assessment; extend as you explore.

| Area | Known gap / note | Your notes |
|------|------------------|------------|
| Realtime | Subscription cleanup on logout not fully automated | |
| Email auth | Supabase email confirmation flow not E2E-tested | |
| Drag pipeline | UI uses select, not drag-and-drop | |
| Production | `DEPLOY-*` specs planned for Phase 14 | |
| GitHub Actions | Workflow file deferred; recipe in [ci-e2e-recipe.md](./ci-e2e-recipe.md) | |
| Load testing | Out of scope for MVP | |
| OAuth in CI | Must use env tokens when `CI=true` | |

---

## Evaluation mapping

| Review question | Test IDs |
|-----------------|----------|
| Backend role checks? | All `API-*` rows |
| Client chat isolation? | CHAT-07, CHAT-08, CHAT-09 |
| Sales cannot move others’ deals? | DEAL-03, API-DEAL-02 |
| Manager dashboard? | DASH-01–05, EVAL-05 |
| Full happy path? | EVAL-01–05 (`@smoke`) |

See [project_requirements/evaluation.md](../project_requirements/evaluation.md).
