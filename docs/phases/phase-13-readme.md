# Phase 13 — README & documentation compile

**Status:** Not started  
**Started:** —  
**Completed:** —

**Prerequisite:** [Phase 12 — External service authentication](./phase-12-external-auth.md) complete (scripts + `docs/external-auth.md`).

Links: [build-plan](../build-plan.md) · [testing-plan](../testing-plan.md)

---

## Goal

Assessor-ready **documentation layer** without changing auth scripts. Phase 13 is **compile and link**, not re-planning.

---

## Deliverables

| Artifact | Contents |
|----------|----------|
| **Root `README.md`** | Short onboarding (~80–120 lines): clone, env, dev, seed, demo users, test one-liner, doc index |
| **`docs/testing-guide.md`** | Human-readable test catalog (all 50 E2E + 8 Vitest), how to invoke, **how to add a test**, edge-case worksheet |
| **`docs/infrastructure-phases.md`** | Phases **1–5** (no per-phase files today): tools, worker/frontend scaffold, cloud env, database |
| **`docs/project-guide.md`** | Full compile: architecture, phases 6–11 summary, auth § → `external-auth.md`, testing → `testing-guide.md`, troubleshooting |
| **`docs/README.md`** | Updated index of all docs |
| **`docs/deploy-guide.md`** | **Stub only** — “Completed in Phase 14”; no deploy steps yet |
| **This phase doc** | Mark complete; evaluation mapping table |

**Out of scope:** deploy instructions, production URLs, `DEPLOY-*` specs, script auth changes.

---

## Root `README.md` layout (approved)

1. Title + one-paragraph description  
2. **Quick start** (numbered: clone → env → install → db:schema/seed → dev servers → open app)  
3. **Demo users** (compact table, password `demo1234`)  
4. **Running tests** (one paragraph + link to testing guide)  
5. **Documentation** — table with **repo-root symlinks** (see below)  
6. **Requirements** → `project_requirements/`  
7. **Future work** — few words + symlink → `docs/roadmap.md`  
8. **Deployment** — few words + symlink → `docs/deploy-guide.md` (stub until Phase 14)

### Symlink + backlink pattern (approved)

Create **root symlinks** for key docs so assessors can open from repo root. Each target doc gets a **backlink** to the exact README anchor.

Example:

**`README.md`:**

```markdown
## Documentation

| Topic | Quick link |
|-------|------------|
| Full roadmap | [docs/roadmap.md](roadmap.md#back-to-readme) |
| Testing (all tests + how to add) | [docs/testing-guide.md](testing-guide.md#back-to-readme) |
| Tooling auth (Cloudflare / Supabase / GitHub) | [docs/external-auth.md](external-auth.md#back-to-readme) |
...
```

**`docs/roadmap.md`** (top of file):

```markdown
[← Back to README — Documentation](../README.md#documentation)
```

Repeat for each symlinked doc (`testing-guide.md`, `external-auth.md`, `quick-start.md`, etc.). Use stable heading anchors (`#documentation`, `#running-tests`, …).

---

## `docs/testing-guide.md` (approved outline)

- Test layers table (E2E vs API vs Vitest vs verify scripts)  
- **Command reference** (`test:e2e`, `test:e2e:dev`, `--grep @phaseN`, `@smoke`, `test:worker`)  
- **Human catalog** by phase (AUTH-01 … EVAL-05) with plain-English descriptions  
- **How to add a test** (8-step workflow from testing-plan IDs)  
- **Edge-case worksheet** (pre-filled gaps + empty “Your notes” section)  
- Link to `testing-plan.md` for machine-oriented matrix  

---

## `docs/infrastructure-phases.md` (approved outline)

| Phase | Topics |
|-------|--------|
| 1 | `install:linux`, Node 22, CLIs, `verify:stack:local` |
| 2 | `worker/`, Hono, `/api/health` |
| 3 | `src/`, Vite, Router, TanStack Query, shadcn |
| 4 | `.env`, `.dev.vars`, `.cloudflare.env`, `verify:stack:cloud` |
| 5 | `db:schema`, `db:seed`, RLS, demo data → `database-setup.md` |

---

## `docs/project-guide.md` compile (approved outline)

1. Overview & stack  
2. Repo layout  
3. Infrastructure → `infrastructure-phases.md`  
4. Features → phase-06 … phase-11 table  
5. Tooling auth → **`external-auth.md`** (from Phase 12)  
6. App roles & API summary  
7. Local dev & testing links  
8. Evaluation checklist → test IDs  
9. Deploy → stub `deploy-guide.md`  
10. CI → `ci-e2e-recipe.md`  
11. Roadmap → `roadmap.md`  
12. Troubleshooting  

---

## Verify

- All README symlinks resolve  
- Backlinks return to correct README section  
- No broken promise of production deploy URLs  
- Optional: one full `npm run test:e2e` noted in phase doc  

---

## Handoff to Phase 14

Deploy guide filled in; README deploy section updated with live URLs.
