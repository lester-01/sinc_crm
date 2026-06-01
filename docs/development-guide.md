[← Back to README — Documentation](../README.md#documentation)

# Development guide

How to work on this codebase day to day: where code lives, what to run, and **when tests are required or must be updated**.

Related: [testing-guide.md](./testing-guide.md) (catalog + how to add a test) · [database-setup.md](./database-setup.md)

---

## Repo layout (where to change things)

| Area | Path | You change it when… |
|------|------|---------------------|
| UI | `src/` (`features/`, `pages/`, `components/`) | Routes, forms, lists, pipeline, dashboard |
| API | `worker/src/` (routes, services, `schemas/`, middleware) | Endpoints, validation, role checks |
| Schema | `supabase/schema/*.sql` | Tables, enums, RLS, functions |
| Seed | `scripts/db-seed.mjs` | Demo users, sample clients/deals/threads |
| Tooling | `scripts/` | Setup, E2E orchestration, verify scripts |
| E2E | `e2e/specs/`, `e2e/fixtures/` | User-visible flows and API contract tests |
| Worker unit | `worker/src/**/*.test.ts` | Pure logic (Zod, helpers) |

**Data flow:** browser → Worker (`/api/*`) for CRM; Supabase client for Auth + Realtime only. See [project-guide.md](./project-guide.md#2-architecture--data-flow).

---

## Daily workflow

```bash
# Terminal 1 — frontend :5173
npm run dev

# Terminal 2 — API :8787
cd worker && npm run dev
```

Use `.env` + `worker/.dev.vars` (or env vars per [external-auth.md](./external-auth.md)). Demo logins: [README § Demo users](../README.md#demo-users).

**Before opening a PR or finishing a feature**, run the checks in [Pre-merge checklist](#pre-merge-checklist) below.

---

## Branch policy

| Branch | Purpose |
|--------|---------|
| **`development`** | All day-to-day work — features, fixes, tests, docs |
| **`main`** | Stable releases only — **no direct commits** |

**Rules:**

1. Never commit on `main`. Always work on `development`.
2. Promote stable work: `git checkout main` → `git merge development` (usually fast-forward) → tag if needed → **`git checkout development`** before the next task.
3. Do not push to `origin` unless you intend to publish; coordinate before force-pushing `main`.

Cursor agents also follow [`.cursor/rules/git-branches.mdc`](../.cursor/rules/git-branches.mdc).

---

## Feature workflow (new or changed behavior)

Use this for anything that affects users, APIs, or security — not for typo-only doc edits.

### 1. Plan

- Skim [project_requirements/](../project_requirements/) if the feature touches acceptance criteria.
- Add or update a row in [testing-plan.md](./testing-plan.md) with a test ID (`FEATURE-NN` or next ID in the phase), layer (E2E / API / Vitest), and expected outcome.
- If the feature needs new schema or seed data, plan [database-setup.md](./database-setup.md) steps (`db:schema` on empty DB only; `db:seed` for demo rows).

### 2. Implement

- Match existing patterns in the nearest `features/*` module and worker route.
- **API:** enforce roles on the Worker (401/403), not only in the UI.
- **Schema:** add SQL under `supabase/schema/` in order; do not auto-drop production data from scripts.

### 3. Test (required for features)

| Change type | Minimum tests |
|-------------|----------------|
| New user-facing flow (page, form, nav) | At least one **E2E** in the matching `e2e/specs/phase-*.spec.ts` |
| New or changed API contract / authorization | **API test** in Playwright (`request`) and/or **Vitest** for validators |
| Zod / mapping / CORS / pure helpers | **Vitest** in `worker/` |
| Setup / env / auth scripts only | **`npm run test:scripts`** (`AUTH-LADDER-*`) if ladder behavior changes |

**New features must include tests** in the same change (or the immediately following commit on the same branch). Do not merge behavior without coverage unless you document explicit deferral in `testing-plan.md` with a reason.

Step-by-step for writing tests: [testing-guide.md § How to add a test](./testing-guide.md#how-to-add-a-test).

### 4. Run locally

```bash
# Fast iteration (your dev Supabase + running dev servers)
npm run test:e2e:dev -- --grep @phaseN    # or test title / ID

# Worker + tooling
npm run test:worker
npm run test:scripts                      # if you touched scripts/lib or auth

# Full regression (isolated temp DB — same as pre-release)
npm run test:e2e
```

### 5. Document

- Update [testing-guide.md](./testing-guide.md) when adding test IDs.
- Note non-obvious deferred behavior in [roadmap.md](./roadmap.md).

---

## When you change the database

**Not every migration forces E2E updates.**

| Schema change | Usually need test updates? |
|---------------|---------------------------|
| New column/table **not used** by app yet | No |
| Index, constraint, RLS only (behavior unchanged from user view) | No |
| Seed data change (names, counts, demo emails) | **Yes** — specs that assert seed rows or links |
| New stage enum / renamed stage labels | **Yes** — pipeline and deal specs |
| API or UI now depends on new field | **Yes** — E2E and/or API tests for that flow |

Apply schema: `npm run db:schema` (empty DB). Adjust seed: `scripts/db-seed.mjs` + `npm run db:seed`. Details: [database-setup.md](./database-setup.md).

---

## When a test fails

Treat a failing test as a signal, not an annoyance.

### Step 1 — Reproduce

```bash
npm run test:e2e:dev -- --grep "TEST-ID or title"   # during dev
# or
npm run test:e2e -- --grep @phaseN                  # isolated full suite
```

Read artifacts under `test-results/` ([e2e-artifacts.md](./e2e-artifacts.md)): screenshot, trace, `[TEST-ID]` logs.

### Step 2 — Decide: product bug or outdated test?

| Situation | Action |
|-----------|--------|
| App behavior is **wrong** vs requirements / security matrix | **Fix the product**; test should pass unchanged |
| You **intentionally** changed UX, API, or seed contract | **Update the test** and [testing-plan.md](./testing-plan.md) description |
| Flaky locator or timing | Stabilize assertion (unique data, scoped locators, `data-testid` if needed) — see [testing-guide.md](./testing-guide.md) |
| Isolated E2E setup failed (schema/seed) | Fix scripts/env ([external-auth.md](./external-auth.md)), not Playwright |

### Step 3 — Re-evaluate the test ID

- Does the test still assert the **right** security or UX guarantee?
- If the old assertion is no longer meaningful, replace it — do not weaken security checks (403/404, privacy) without explicit approval in the plan doc.

### Step 4 — Re-run the right scope

- Touch API only → `test:worker` + targeted `test:e2e:dev` API tests.
- Touch one feature → `@phaseN` grep.
- Before release → full `npm run test:e2e`.

---

## Pre-merge checklist

- [ ] Feature behavior covered by new or updated tests (see [Feature workflow](#feature-workflow-new-or-changed-behavior))
- [ ] `npm run test:worker` (if worker code changed)
- [ ] `npm run test:scripts` (if stack env / auth scripts changed)
- [ ] `npm run test:e2e:dev` for the phase you touched (dev servers running)
- [ ] `npm run test:e2e` before release or when changing seed, schema apply, or shared fixtures
- [ ] [testing-guide.md](./testing-guide.md) updated when test IDs added
- [ ] No secrets committed (`.env`, `.dev.vars`, `.cloudflare.env` stay local)

---

## Commands cheat sheet

| Task | Command |
|------|---------|
| Install / CLIs | `npm run install:linux` or `npm run setup:local` |
| Apply schema (empty DB) | `npm run db:schema` |
| Seed demo data | `npm run db:seed` |
| Typecheck frontend | `npm run typecheck` |
| Typecheck worker | `cd worker && npm run typecheck` |
| All E2E (isolated DB) | `npm run test:e2e` |
| E2E on dev DB | `npm run test:e2e:dev` |
| Worker unit tests | `npm run test:worker` |
| Tooling auth tests | `npm run test:scripts` |
| Stack verify | `npm run verify:stack:supabase` etc. |

---

## What not to do

- Do not rely on Cursor browser MCP as proof tests pass — only Playwright counts ([testing-guide.md](./testing-guide.md)).
- Do not commit API tokens or database passwords.
- Do not run `db:schema` on a database that already has tables (script fails by design).
- Do not delete failing tests to green CI without replacing coverage.

---

## Further reading

| Topic | Doc |
|-------|-----|
| Add / catalog tests | [testing-guide.md](./testing-guide.md) |
| Security constraints to cover | [testing-plan.md](./testing-plan.md) |
| Architecture & troubleshooting | [project-guide.md](./project-guide.md) |
| CI later | [ci-e2e-recipe.md](./ci-e2e-recipe.md) |
| Deploy (Worker + Pages, two-pass manual CLI) | [deploy-guide.md](./deploy-guide.md) — GitHub→Cloudflare CI planned alongside CLI |
