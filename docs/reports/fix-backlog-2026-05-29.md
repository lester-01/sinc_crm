# Fix backlog — single source of truth (2026-05-29)

**Scope:** All FIX-### (Phases A–G). **Excluded:** I9, I19 (IGNORE). **Skipped:** FIX-084, FIX-085, FIX-086 (per plan).

**Evidence:** [ui-ux-audit-2026-05-29.md](ui-ux-audit-2026-05-29.md) · [ui-improvement-backlog-validated-2026-05-29.md](ui-improvement-backlog-validated-2026-05-29.md)

---

## Progress

| Phase | Done | Total |
|-------|-----:|------:|
| A | 6 | 6 |
| B | 8 | 8 |
| C | 6 | 6 |
| D | 3 | 3 |
| E | 8 | 8 |
| F | 6 | 7 |
| G | 3 | 3 |
| Verify | 1 | 1 |

---

## Phase A — Bugs, RBAC, copy

- [x] **FIX-010** — Lost reason only when stage is `lost`
- [x] **FIX-020** — Client redirect from `/pipeline`
- [x] **FIX-021** — Role-specific Clients description
- [x] **FIX-022** — Activity timestamps on client detail
- [x] **FIX-023** — Name cell secondary line
- [x] **FIX-024** — Dashboard activity plain timestamps

## Phase B — Shell and login

- [x] **FIX-030** — Demo account emails on login
- [x] **FIX-031** — Mobile login brand hero
- [x] **FIX-032** — Header search coming-soon affordance
- [x] **FIX-033** — Nav label clipping (short labels / Chats)
- [x] **FIX-034** — Profile chevron + a11y
- [x] **FIX-035** — Mobile nav hamburger sheet
- [x] **FIX-036** — `prefers-reduced-motion`
- [x] **FIX-037** — NotFound page

## Phase C — Forms, scroll

- [x] **FIX-040** — Textarea for first messages
- [x] **FIX-041** — Create client dialog UX
- [x] **FIX-042** — Client detail list caps
- [x] **FIX-043** — Cap dashboard/deal history
- [x] **FIX-044** — Dashboard ScrollArea
- [x] **FIX-045** — Pipeline viewport scroll

## Phase D — shadcn Select

- [x] **FIX-050** — Native select → shadcn
- [x] **FIX-051** — Pipeline owner name Select
- [x] **FIX-052** — Pipeline “Move to” label

## Phase E — Data features

- [x] **FIX-060** — Clients pagination, sort, row click
- [x] **FIX-061** — Clients Created column
- [x] **FIX-062** — Sales clients Mine/Unassigned/All
- [x] **FIX-070** — Manager conversation queues
- [x] **FIX-071** — Thread list relative times
- [x] **FIX-072** — Chat bubbles: time, You, contrast
- [x] **FIX-073** — Mobile conversations back + hide queue

## Phase F — Polish

- [x] **FIX-080** — Client unread (`06_client_read.sql` + worker)
- [x] **FIX-081** — KPI drill-down links
- [x] **FIX-082** — Dropdown z-index guard
- [x] **FIX-083** — Tabular nums on metrics
- [ ] **FIX-086** — Pipeline DnD — **skipped** (post-MVP)
- [x] **FIX-087** — Stage transition limits (`stage-transitions.ts`)
- [x] **FIX-088** — Lost reason presets

**Not implemented (IGNORE ideas):** FIX-084 (I9), FIX-085 (I19)

## Phase G — Documentation

- [x] **FIX-100** — [docs/pipeline-stages.md](../pipeline-stages.md)
- [x] **FIX-101** — [docs/deal-lifecycle.md](../deal-lifecycle.md)
- [x] **FIX-102** — Transitions in pipeline-stages.md

## Verification

- [x] Re-run `node scripts/crawl-ui-audit-v2.mjs` (2026-05-29)

### Post-fix metrics

| Check | Before (v2) | After |
|-------|-------------|-------|
| P08 client `path` | `/pipeline` | `/conversations` (redirect) |
| P08 manager `nativeSelects` | 18 | 0 (shadcn) |
| P03 manager `scrollH` | ~1606 | ~1606 (ScrollArea; page may still scroll) |
| P08 manager `scrollH` | ~2465 | lower with column scroll |

### DB migration for FIX-080

Apply on Supabase/local: `supabase/schema/06_client_read.sql`
