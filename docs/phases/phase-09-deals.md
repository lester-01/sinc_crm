# Phase 09 — Deals & pipeline

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-28

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md)

---

## Goals

- [x] Worker: `GET/POST /api/deals`, `GET /api/deals/:id`, `PATCH stage|owner`, `POST notes`; `deal_stage_history` on stage change; lost requires `lostReason`
- [x] Role rules: sales create/update **own** deals; manager any deal + reassign owner; client `POST` forbidden
- [x] PipelinePage: 8 stage columns, search, stage `<select>` (no drag-drop)
- [x] DealDetailPage: stage select, notes, history, manager reassign
- [x] Client detail: New Deal form, deal links, active-deal summary
- [x] `src/lib/realtime.ts` — `subscribeToDeals()` invalidates deals queries
- [x] E2E/API: `DEAL-*`, `PIPE-*`, `API-DEAL-*` in `e2e/specs/phase-09-deals.spec.ts`

---

## Verify

```bash
npm run dev
cd worker && npm run dev
npm run test:e2e:dev -- --grep @phase9
```

**Note:** `test:e2e:dev` expects Vite (`:5173`) and Worker (`:8787`) running, or use `npm run test:e2e -- --dev --grep @phase9` (Playwright `webServer` starts both).

**E2E helper:** `ensureCanadaDealForSales1` resets seed deal owner/stage when prior runs pollute state.

---

## Handoff to Phase 10

Manager dashboard — `GET /api/dashboard`, `DASH-*` tests.
