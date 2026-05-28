# Phase 06 — App foundation

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md) · [stack-setup](../stack-setup.md)

---

## Goals

- [x] Working login (email + password)
- [x] Supabase Auth session wired to `apiFetch`
- [x] Protected routes and role-aware app shell
- [x] Isolated E2E orchestrator + Playwright specs (`AUTH-*`, `NAV-*`)
- [x] shadcn: input, label, card, dropdown-menu

---

## Implementation

### Worker

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/me` | Used by `AuthProvider` via `fetchMe()` |

### Frontend

| Page / feature | Path |
|----------------|------|
| Login | `/login` — sign in + client sign up |
| Auth | `src/features/auth/*` — context, protected route, nav by role |
| App shell | Role-filtered nav, user menu, sign out |

### E2E

| Script | Purpose |
|--------|---------|
| `scripts/e2e-run.mjs` | Isolated DB pipeline; `--dev` skips create/delete |
| `scripts/e2e-create-project.mjs` | `sinc-ci-e2e-*` via Management API |
| `npm run test:e2e:ui` | Playwright UI mode (preferred locally) |
| `npm run test:e2e:dev` | Tests against existing dev Supabase |

---

## Tests added

| Test ID | Status |
|---------|--------|
| AUTH-01 … AUTH-07 | Implemented in `e2e/specs/phase-06-auth.spec.ts` |
| NAV-01 … NAV-03 | Implemented |

Run locally (WSL):

```bash
# If browsers fail: sudo npx playwright install-deps chromium
npm run test:e2e:dev -- --grep @phase6
npm run test:e2e:ui -- --grep @phase6   # watch in UI
```

API-only checks pass without browser libs. UI tests need Playwright system deps on WSL.

---

## Decisions

- **Role home:** manager → `/dashboard`, sales → `/clients`, client → `/conversations`
- **Client nav:** Clients + Conversations only (no Dashboard/Pipeline)
- **Sales nav:** no Dashboard
- **E2E login:** assert `GET /api/me` after sign-in

---

## Handoff to Phase 7

- Use `useAuth()` / `apiFetch` for clients API and pages
