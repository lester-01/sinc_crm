# Testing plan — constraints, catalog, local + CI

How we verify the application does not regress. Tests are added **incrementally per build phase** (not only at the end).

**Now (Phases 6–11):** Local isolated E2E **headless** (`npm run test:e2e`) as features land. Playwright **UI mode** is optional (test-runner dashboard, not live browser automation).  
**Default E2E run:** **isolated** — create `sinc-ci-e2e-*` Supabase → seed → test → report → delete.  
**Artifacts:** [e2e-artifacts.md](./e2e-artifacts.md) — per-test logs/screenshots/traces under `test-results/`.  
**GitHub Actions:** **not now** — same orchestrator later; see [ci-e2e-recipe.md](./ci-e2e-recipe.md).

Related: [build-plan.md](./build-plan.md), [stack-setup.md](./stack-setup.md), [evaluation.md](../project_requirements/evaluation.md)

---

## What kind of tests are these?

| Layer | Type | Tool | Local now? | CI later? | What it proves |
|-------|------|------|------------|-----------|----------------|
| **A. E2E UI** | End-to-end (not unit) | **Playwright** — real Chromium | **Yes** | Yes | User-visible flows: login, navigation, forms, lists, chat send, pipeline stage change |
| **B. API authorization** | Integration / contract | **Playwright `request`** or **Vitest + fetch** | **Yes** | Yes | Worker returns correct status codes and bodies; **role constraints** without relying on UI selectors |
| **C. Worker unit** | Unit | **Vitest** in `worker/` | **Yes** | Yes | Pure logic: zod schemas, mapping, helpers, service functions with mocked Supabase |
| **D. Stack verify** | Smoke / infra | `npm run verify:stack:*` | Yes | Yes (subset) | Env files, schema presence, deploy reachability — **not** business rules |
| **E. Browser MCP** | Manual / exploratory | cursor-ide-browser | Optional | **No** | Agent debugging in Cursor — **not** a substitute for Playwright |

**Summary:** Browser automation for regression = **E2E tests (Playwright)**. They are **not** unit tests. The **Cursor built-in browser** (MCP) does **not** run Playwright test files; use `npm run test:e2e` in the terminal.

---

## Isolated E2E run (default — local + CI)

Same procedure everywhere (mirrors future GitHub Actions):

1. Create Supabase `sinc-ci-e2e-<timestamp>`
2. `db:schema` + `db:seed` on that project
3. Run Playwright (headless locally and in CI; optional `--ui` for debugging)
4. Write [artifacts](./e2e-artifacts.md) under `test-results/YYYY-MM-DD_HH-mm-ss/`
5. Delete Supabase project (`always()`)

Orchestrator: `scripts/e2e-run.mjs` (Phase 6).

### What you need once (your action)

```bash
npm install
npx playwright install chromium
```

### E2E-only credentials (optional until you run isolated E2E)

**Not required** for `npm run dev`, Worker, `db:schema`, or `db:seed` on your **dev** project.

Add to `worker/.dev.vars` only when running `npm run test:e2e` or `test:e2e:ui`:

```env
SUPABASE_ACCESS_TOKEN=...   # create/delete sinc-ci-e2e-* projects
SUPABASE_ORG_SLUG=...       # org slug from dashboard URL (…/org/<slug>/…)
```

See [playwright-wsl-setup.md](./playwright-wsl-setup.md) for WSL install steps.

Your **dev** Supabase project stays for day-to-day work. Isolated E2E does **not** mutate it by default.

### Commands

| Command | Use |
|---------|-----|
| `npm run test:e2e` | Isolated run, headless, artifacts |
| `npm run test:e2e:ui` | Isolated + Playwright UI (optional; not live browser watch) |
| `npm run test:e2e -- --grep @phase6` | Isolated subset |
| `npm run test:e2e:dev` | Optional fast path: existing dev `.env`, no create/delete |
| `npm run test:worker` | Vitest (no Supabase project churn) |

**Agent default:** `npm run test:e2e:ui` so you see tests in Playwright UI; logs and screenshots still land under `test-results/`.

### Cursor browser vs Playwright

| | Cursor IDE browser (MCP) | Playwright |
|---|--------------------------|------------|
| Purpose | Click around while coding | Repeatable regression tests |
| Runs `*.spec.ts` | **No** | **Yes** |
| CI | No | Yes (later) |
| Use when | Exploring a bug visually | Asserting roles, privacy, flows |

Both can coexist; **only Playwright counts** for “tests pass.”

---

## Harness (Phase 6 — first implementation task)

Planned layout (created when Phase 6 starts):

```txt
e2e/
  playwright.config.ts
  fixtures/
    auth.ts
  helpers/
    api.ts
    log.ts                 # [TEST-ID] START/STEP/ASSERT/PASS|FAIL
  reporters/
    artifact-reporter.ts   # per-test folders under test-results/
  specs/
    phase-06-auth.spec.ts
    ...
scripts/
  e2e-run.mjs              # create → seed → playwright → cleanup
  e2e-create-project.mjs
  e2e-delete-project.mjs
test-results/                # gitignored — see e2e-artifacts.md
.e2e-run.env                 # gitignored — ephemeral keys per run
```

Phase 6 implements orchestrator + Playwright + artifact layout. **GitHub workflow** file comes later ([ci-e2e-recipe.md](./ci-e2e-recipe.md)); it calls the **same** `e2e-run.mjs` without `--ui`.

### Demo users (from seed)

| Role | Email (examples) | Password |
|------|------------------|----------|
| Manager | `manager1@demo.local` | `demo1234` |
| Sales | `sales1@demo.local`, `sales2@demo.local` | `demo1234` |
| Client | `client1@demo.local`, `client2@demo.local` | `demo1234` |

Use stable seed data from [database-setup.md](./database-setup.md) for assertions (client names, thread subjects, deal titles).

---

## When tests are written

| Build phase | Add tests |
|-------------|-----------|
| **6 — Foundation** | Harness + `AUTH-*`, `NAV-*` |
| **7 — Clients** | `CLI-*`, `API-CLI-*` |
| **8 — Conversations** | `CHAT-*`, `API-CONV-*` (privacy-critical) |
| **9 — Deals** | `DEAL-*`, `PIPE-*`, `API-DEAL-*` |
| **10 — Dashboard** | `DASH-*` |
| **11 — Polish** | Fill gaps, `@smoke` full suite, acceptance checklist spec |
| **12 — Tooling auth** | `AUTH-LADDER-*` in `scripts/lib/*.test.mjs`; document ladder |
| **13 — Docs** | — (no new test IDs) |
| **14 — Deploy** | Optional `@deploy` smoke against production URLs |

Tag tests with `@phase6`, `@phase7`, … for targeted runs: `npx playwright test --grep @phase8`.

---

## Security & constraint matrix (must be covered)

These are **non-negotiable** assertions. Each maps to one or more test IDs below.

| Constraint | Roles | Expected |
|------------|-------|----------|
| Unauthenticated API | — | `401` on protected routes |
| Wrong role API | client / sales / manager | `403` where spec forbids action |
| Client isolation | client | Only own `clientId`, threads, messages, deals |
| Sales deal ownership | sales | Cannot PATCH stage/owner on another rep’s deal |
| Manager override | manager | Can reassign conversations and deal owners |
| Chat privacy | client A vs client B | A never sees B’s thread/messages in API or UI |
| Dashboard | non-manager | No manager metrics (API 403 + nav hidden) |
| Stage history | any allowed stage change | Row in `deal_stage_history` (API or DB check) |
| Lost deal | sales/manager | Requires `lostReason` when stage = `lost` |

---

## Test catalog

Status legend: **Planned** → **Implemented** when the phase lands.

### Phase 6 — Auth & navigation (`@phase6`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| AUTH-01 | E2E | Manager login | Lands on app; `GET /api/me` role `manager` |
| AUTH-02 | E2E | Sales login | Role `sales`; dashboard nav **not** visible |
| AUTH-03 | E2E | Client login | Role `client`; reduced nav |
| AUTH-04 | E2E | Invalid credentials | Error message; stays on login |
| AUTH-05 | E2E | Logout | Session cleared; `/login` on protected visit |
| AUTH-06 | API | No token `/api/clients` | `401` |
| AUTH-07 | API | No token `/api/me` | `401` |
| NAV-01 | E2E | Manager nav | Dashboard, Clients, Conversations, Pipeline links work |
| NAV-02 | E2E | Client nav | No Pipeline/Dashboard if not allowed by spec |
| NAV-03 | E2E | Direct URL guard | Unauthenticated `/clients` → redirect login |

### Phase 7 — Clients (`@phase7`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| CLI-01 | E2E | Manager client list | Seeded clients visible (≥5 rows; Aida Client link) |
| CLI-02 | E2E | Sales creates client | New row appears; valid email |
| CLI-03 | E2E | Client own profile | `client1` sees own name/email only on detail |
| CLI-04 | E2E | Client cannot open other client | Navigate to other UUID → forbidden or redirect |
| API-CLI-01 | API | Client `GET /api/clients` | Only own client (or 403 list) per implementation |
| API-CLI-02 | API | Client `GET /api/clients/:otherId` | `403` or `404` |
| API-CLI-03 | API | Sales `POST /api/clients` | `201` with body |
| API-CLI-04 | API | Client `POST /api/clients` | `403` |

### Phase 8 — Conversations & chat (`@phase8`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| CHAT-01 | E2E | Client starts conversation | Thread appears; first message visible |
| CHAT-02 | E2E | Client sends message | Message in thread; `last_message_at` updated (API optional) |
| CHAT-03 | E2E | Sales sees unassigned queue | Unassigned thread in list |
| CHAT-04 | E2E | Sales assigns to self | Owner updated; can reply |
| CHAT-05 | E2E | Sales reply | Message visible to client (second context or API) |
| CHAT-06 | E2E | Manager reassign | Thread owner changes |
| CHAT-07 | E2E | **Privacy** client1 vs client2 | client1 thread **not** in client2 UI list |
| CHAT-08 | API | **Privacy** client1 `GET` client2 thread | `403` or `404` |
| CHAT-09 | API | client1 `GET` own thread messages | `200`; includes own messages |
| API-CONV-01 | API | Sales assign unassigned | `200` / owner set |
| API-CONV-02 | API | Sales assign without permission | `403` where applicable |

### Phase 9 — Deals & pipeline (`@phase9`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| DEAL-01 | E2E | Sales creates deal for client | Deal on client detail + pipeline |
| DEAL-02 | E2E | Sales moves **own** deal stage | Column/card updates; history visible on detail |
| DEAL-03 | E2E | Sales blocked on other's deal | Stage change fails (UI disabled or API error) |
| DEAL-04 | E2E | Manager reassigns deal owner | Owner label updates |
| DEAL-05 | E2E | Add deal note | Note appears on deal detail |
| DEAL-06 | API | Stage change creates history | `GET /api/deals/:id` includes new history entry |
| DEAL-07 | API | `lost` without reason | `400` validation error |
| PIPE-01 | E2E | Pipeline shows stages | All 8 stage columns present |
| PIPE-02 | E2E | Stage via Select (not drag) | Card moves after select |
| API-DEAL-01 | API | Client cannot `POST /api/deals` | `403` (if spec) |
| API-DEAL-02 | API | Manager `PATCH` any deal stage | `200` |

### Phase 10 — Dashboard (`@phase10`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| DASH-01 | E2E | Manager dashboard loads | Metric cards + stage/owner sections |
| DASH-02 | E2E | Sales no dashboard | Nav hidden or route blocked |
| DASH-03 | API | Manager `GET /api/dashboard` | `200` with numeric fields |
| DASH-04 | API | Sales `GET /api/dashboard` | `403` |
| DASH-05 | API | Dashboard counts | Match known seed totals (snapshot or min thresholds) |

### Phase 12 — Tooling auth ladder (`npm run test:scripts`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| AUTH-LADDER-01 | Unit | `isCiEnvironment` | Only `CI=true` is headless |
| AUTH-LADDER-02 | Unit | `isPlaceholder` | Rejects `your-*`, short values |
| AUTH-LADDER-03 | Unit | `parseEnvFile` | Quoted/unquoted parse |
| AUTH-LADDER-04 | Unit | `hasCloudflareStackKeys` | Token required, non-placeholder |
| AUTH-LADDER-05 | Unit | `hasFrontend/WorkerStackKeys` | Required Supabase keys |
| AUTH-LADDER-06 | Unit | `loadStackEnv` | Env overrides file |
| AUTH-LADDER-07 | Integration | `ensure-cloudflare-auth.sh` | `CI=true` fail fast, no `wrangler login` |
| AUTH-LADDER-08 | Integration | `require-stack-credentials.mjs` | Env-only credentials OK |
| AUTH-LADDER-09 | Integration | `require-stack-credentials.mjs` | Missing CF token → exit 1 |
| AUTH-LADDER-10 | Integration | `verify-github-actions.mjs` | `CI=true` → no gh OAuth message |

Spec files: `scripts/lib/load-stack-env.test.mjs`, `scripts/lib/auth-ladder.integration.test.mjs`.

### Phase 11 — Regression & core flows (`@smoke`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| EVAL-01 | E2E | Core path: client chat | CHAT-01 + CHAT-02 |
| EVAL-02 | E2E | Core path: sales assign + reply | CHAT-03–05 |
| EVAL-03 | E2E | Core path: manager reassign | CHAT-06 |
| EVAL-04 | E2E | Core path: deal + pipeline | DEAL-01–02 |
| EVAL-05 | E2E | Core path: dashboard real data | DASH-01 + DASH-05 |

### Phase 14 — Deploy (optional `@deploy`)

| ID | Layer | Test | Assert |
|----|-------|------|--------|
| DEPLOY-01 | E2E | Production health | Pages loads; `GET /api/health` ok |
| DEPLOY-02 | E2E | Production login smoke | Manager login against `BASE_URL` env |

---

## Worker unit tests (Vitest) — planned alongside services

| Area | Examples |
|------|----------|
| Zod request bodies | Invalid email, missing `lostReason` |
| Role helper | `requireRole(['manager'])` rejects `sales` |
| Service mapping | DB snake_case → API camelCase |

Not a replacement for E2E privacy tests — API tests duplicate critical constraints for speed and stability.

---

## Running tests locally

```bash
# Terminal 1 & 2 (if not using Playwright webServer)
npm run dev
cd worker && npm run dev

# After harness exists:
npm run test:e2e
npm run test:e2e -- --grep @phase8
npm run test:worker
```

Environment: same `.env` and `worker/.dev.vars` as dev; seeded DB required.

---

## Implementation tracking

Update this section as tests land:

| Phase | Planned | Implemented | Spec file |
|------:|--------:|------------:|-----------|
| 6 | 10 | 10 | `e2e/specs/phase-06-auth.spec.ts` |
| 7 | 8 | 8 | `e2e/specs/phase-07-clients.spec.ts` |
| 8 | 11 | 11 | `e2e/specs/phase-08-conversations.spec.ts` |
| 9 | 11 | 11 | `e2e/specs/phase-09-deals.spec.ts` |
| 10 | 5 | 5 | `e2e/specs/phase-10-dashboard.spec.ts` |
| 11 | 5 | 5 | `e2e/specs/phase-11-eval-smoke.spec.ts` |
| 12 | 10 | 10 | `scripts/lib/load-stack-env.test.mjs`, `auth-ladder.integration.test.mjs` |
| 14 | 2 | 2 | `e2e/specs/phase-14-deploy.spec.ts` (skipped until `DEPLOY_*` URLs set) |

**Total planned:** 52 E2E/API Playwright cases + 10 tooling auth (Node test) + 8 Worker Vitest.

---

## Out of scope for automated tests (MVP)

- Drag-and-drop pipeline
- Email delivery / Supabase email confirmation flow
- Cloudflare token rotation
- Visual pixel-perfect wireframe diff
- Load / performance testing

---

## Review question coverage

| Review question | Test IDs |
|-----------------|----------|
| Sales updates deal they do not own? | DEAL-03, API-DEAL-02 |
| Role checks on backend? | All `API-*` rows |
| Avoid showing another client's chat? | CHAT-07, CHAT-08, CHAT-09 |
| Realtime cleanup? | Manual in phase doc; optional future `RT-*` |
| Indexes? | Documented in phase-09 doc, not E2E |
