# Phase 07 — Clients

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md)

---

## Goals

- [x] Worker: `GET/POST /api/clients`, `GET /api/clients/:id` + `clientsService` + zod
- [x] Frontend: `src/features/clients/` hooks + ClientsPage + ClientDetailPage
- [x] E2E/API tests: `CLI-*`, `API-CLI-*` in `e2e/specs/phase-07-clients.spec.ts`
- [x] Role scoping: manager/sales see all; client sees own row only; create blocked for clients

---

## Verify

```bash
npm run dev
cd worker && npm run dev
npm run test:e2e:dev -- --grep @phase7
```

**E2E:** Headless only for phase work. Playwright UI mode is the test-runner dashboard, not a live view of automation.

---

## Handoff to Phase 8

Conversations routes + ConversationPage wiring; realtime chat.
