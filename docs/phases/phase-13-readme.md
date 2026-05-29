# Phase 13 — README & documentation compile

**Status:** Complete  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

**Prerequisite:** [Phase 12 — External service authentication](./phase-12-external-auth.md) complete.

Links: [build-plan](../build-plan.md) · [testing-guide](../testing-guide.md) · [README](../../README.md)

---

## Deliverables

| Artifact | Status |
|----------|--------|
| Root `README.md` | Done |
| `docs/testing-guide.md` | Done — 50 E2E + 8 Vitest catalog, how to add, edge-case worksheet |
| `docs/infrastructure-phases.md` | Done — Phases 1–5 |
| `docs/project-guide.md` | Done — compiled sections 1–13 |
| `docs/deploy-guide.md` | Stub — Phase 14 |
| Root symlinks + backlinks | Done — 10 symlinks, back links on target docs |
| `docs/README.md` | Updated index |

---

## Evaluation mapping (assessor quick reference)

| Evaluation theme | Where to look |
|------------------|---------------|
| Run app locally | [README](../../README.md#quick-start) |
| Demo logins | [README](../../README.md#demo-users) |
| All automated tests | [testing-guide.md](../testing-guide.md) |
| Security / roles | [testing-plan.md](../testing-plan.md) constraint matrix |
| Tooling / CI secrets | [external-auth.md](../external-auth.md) |
| Architecture | [project-guide.md](../project-guide.md) §2 |
| Deferred work | [roadmap.md](../roadmap.md) |

---

## Verify

```bash
# Symlinks resolve from repo root
test -f roadmap.md && test -f testing-guide.md

# Optional full isolated E2E (needs E2E Supabase token vars)
npm run test:e2e
```

---

## Handoff to Phase 14

Fill [deploy-guide.md](../deploy-guide.md); deploy Worker + Pages; update README deployment section with production URLs; optional `DEPLOY-*` tests.
