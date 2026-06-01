# Testing plan — constraints, security matrix, isolated E2E

Machine-oriented testing philosophy and **non-negotiable security constraints**. Full test ID catalog: [testing-guide.md](./testing-guide.md).

Related: [e2e-artifacts.md](./e2e-artifacts.md), [ci-e2e-recipe.md](./ci-e2e-recipe.md), [evaluation.md](../project_requirements/evaluation.md)

---

## What kind of tests are these?

| Layer | Type | Tool | What it proves |
|-------|------|------|----------------|
| **A. E2E UI** | End-to-end | Playwright — real Chromium | Login, navigation, forms, chat, pipeline, dashboard |
| **B. API authorization** | Integration | Playwright `request` | Worker status codes; **role constraints** without UI selectors |
| **C. Worker unit** | Unit | Vitest in `worker/` | Zod schemas, CORS helper, validation rules |
| **D. Stack verify** | Smoke / infra | `npm run verify:*` | Env, schema, deploy reachability — not business rules |
| **E. Tooling auth** | Integration | `npm run test:scripts` | Env vs files auth ladder |

**Summary:** Browser regression = **Playwright E2E**. Cursor IDE browser (MCP) does **not** run `*.spec.ts` files.

---

## Isolated E2E run (default)

Same procedure for local and future CI:

1. Create Supabase `sinc-ci-e2e-<timestamp>`
2. `db:schema` + `db:seed`
3. Run Playwright (headless by default)
4. Write artifacts under `test-results/` — [e2e-artifacts.md](./e2e-artifacts.md)
5. Delete Supabase project (`always()`)

Orchestrator: `scripts/e2e-run.mjs`.

### E2E-only credentials

Add to `worker/.dev.vars` when running `npm run test:e2e`:

- `SUPABASE_ACCESS_TOKEN` — create/delete isolated projects
- `SUPABASE_ORG_SLUG` — org slug from dashboard URL

Not required for `npm run dev`. WSL: [playwright-wsl-setup.md](./playwright-wsl-setup.md).

### Commands

| Command | Use |
|---------|-----|
| `npm run test:e2e` | Isolated run, headless, artifacts |
| `npm run test:e2e:ui` | Isolated + Playwright UI mode |
| `npm run test:e2e:dev` | Existing dev `.env`, no create/delete |
| `npm run test:worker` | Vitest |
| `npm run test:scripts` | Tooling auth ladder tests |

Tag runs: `npx playwright test --grep @phase8` or `@smoke`.

---

## Security & constraint matrix (must be covered)

| Constraint | Roles | Expected |
|------------|-------|----------|
| Unauthenticated API | — | `401` on protected routes |
| Wrong role API | client / sales / manager | `403` where spec forbids action |
| Client isolation | client | Only own client, threads, messages, deals |
| Sales deal stage | sales | Cannot PATCH stage on another rep's deal |
| Manager writes | manager | Cannot POST clients, deals, conversations, messages, or notes |
| Manager override | manager | Can reassign conversations/deal owners (sales targets only); move any deal stage |
| Chat privacy | client A vs B | A never sees B's thread/messages |
| Dashboard | non-manager | API `403` + nav hidden |
| Stage history | stage change | Row in `deal_stage_history` |
| Lost deal | sales/manager | Requires `lostReason` when stage = `lost` |

Test IDs covering these: [testing-guide.md](./testing-guide.md).

---

## Worker unit tests (Vitest)

| Area | Examples |
|------|----------|
| Zod request bodies | Invalid email, missing `lostReason` |
| CORS helper | Allowed origins |
| Service mapping | DB snake_case → API camelCase |

Not a replacement for E2E privacy tests — API tests duplicate critical constraints for speed.

---

## Implementation summary

| Spec file | Tests |
|-----------|------:|
| `e2e/specs/phase-06-auth.spec.ts` | 10 |
| `e2e/specs/phase-07-clients.spec.ts` | 8 |
| `e2e/specs/phase-08-conversations.spec.ts` | 11 |
| `e2e/specs/phase-09-deals.spec.ts` | 11 |
| `e2e/specs/phase-10-dashboard.spec.ts` | 5 |
| `e2e/specs/phase-11-eval-smoke.spec.ts` | 5 |
| `e2e/specs/phase-14-deploy.spec.ts` | 2 |
| **Total Playwright** | **60** |

Plus Worker Vitest (`npm run test:worker`) and tooling auth tests (`npm run test:scripts`).

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
| Manager cannot create deals? | API-DEAL-03 |
| Avoid showing another client's chat? | CHAT-07, CHAT-08, CHAT-09 |
| Realtime cleanup on logout? | Implemented in code; optional future E2E |
