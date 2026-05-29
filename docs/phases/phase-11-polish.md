# Phase 11 — Polish & full regression

**Status:** Complete  
**Started:** 2026-05-28  
**Completed:** 2026-05-28

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md) · [evaluation.md](../../project_requirements/evaluation.md)

---

## Goals

- [x] Loading / empty / error on major list pages (pipeline error + existing page states)
- [x] TanStack Query keys aligned (`["clients", "self"]` for client conversation bootstrap)
- [x] Client-simplified conversations UI (“Your conversations” label)
- [x] Production CORS via optional `CORS_ORIGINS` on Worker
- [x] Worker Vitest: Zod deal schemas + `corsOrigins` helper
- [x] Evaluation smoke: `EVAL-*` in `e2e/specs/phase-11-eval-smoke.spec.ts` (`@smoke` + `@phase11`)
- [x] Shared E2E helpers: `e2e/helpers/deals-setup.ts`, `e2e/helpers/conversations-setup.ts`

---

## Evaluation mapping

| Required to pass (evaluation.md) | Covered by |
|----------------------------------|------------|
| Supabase Auth works | `AUTH-*` (phase 6), all E2E logins |
| Client create and use chat | `EVAL-01`, `CHAT-*` |
| Sales assign and reply | `EVAL-02`, `CHAT-03`–`05` |
| Manager reassign conversations | `EVAL-03`, `CHAT-06` |
| Sales create deal for client | `EVAL-04`, `DEAL-01` |
| Deal linked to correct client | `EVAL-04` (Aida Client on detail) |
| Deal owner assign / reassign | `DEAL-04`, worker owner PATCH |
| Pipeline stages work | `PIPE-02`, `DEAL-02` |
| Stage history recorded | `DEAL-02`, `DEAL-06` |
| Dashboard real DB data | `EVAL-05`, `DASH-05` |
| UI usable + shadcn/ui | All phase E2E UI tests |
| Backend role checks | `API-*`, `API-CONV-*`, `API-DEAL-*`, `DASH-04` |

**Deferred to later phases:** deployed URLs (phase 13), full README compile (phase 12).

---

## Verify

```bash
npm run dev
cd worker && npm run dev
npm run test:worker
npm run test:e2e:dev -- --grep @phase11
# Full regression (isolated Supabase):
npm run test:e2e
```

---

## Handoff to Phase 12

Root `README.md` + `docs/project-guide.md` compile from phase docs.
