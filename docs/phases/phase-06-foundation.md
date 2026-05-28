# Phase 06 — App foundation

**Status:** Not started  
**Started:** —  
**Completed:** —

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md) · [stack-setup](../stack-setup.md)

---

## Goals

- Working login (email + password inputs, not disabled scaffold)
- Supabase Auth session wired to `apiFetch`
- Protected routes and role-aware app shell per wireframe
- Isolated E2E orchestrator (`sinc-ci-e2e-*` create/seed/test/delete) + Playwright UI + [e2e-artifacts](../e2e-artifacts.md) (workflow file deferred)

---

## Scope

### In scope

- Login, logout, client signup
- `AppShell` improvements (nav, user menu)
- shadcn components needed for auth and shell
- Tests: `AUTH-*`, `NAV-*` ([testing-plan](../testing-plan.md))

### Out of scope (this phase)

- Clients, conversations, deals, dashboard data
- Deploy

---

## Implementation

_(Fill in during Phase 6.)_

### Worker (API)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/me` | Already implemented; verify with each role |

### Frontend

| Page / feature | Path | Wireframe section |
|----------------|------|-------------------|
| Login | `/login` | — |
| App shell | `/` layout | App Shell |

---

## Security & role constraints

| Actor | Allowed | Forbidden |
|-------|---------|-----------|
| client | Login, reduced nav | Manager dashboard nav |
| sales | Login, CRM nav (no dashboard) | Dashboard |
| manager | Full nav including dashboard | — |
| unauthenticated | `/login` | All app routes |

---

## Tests added

| Test ID | Spec file | Status |
|---------|-----------|--------|
| AUTH-01 … NAV-03 | `e2e/specs/phase-06-auth.spec.ts` | Planned |

---

## Verification

```bash
npm run dev
cd worker && npm run dev
npm run test:e2e -- --grep @phase6
```

---

## Decisions & notes

- 

---

## Known issues / debt

- 

---

## Handoff to next phase

- Phase 7 builds on authenticated `apiFetch` and role from `/api/me`
