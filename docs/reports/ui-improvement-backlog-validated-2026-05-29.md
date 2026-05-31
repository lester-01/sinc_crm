# Pre-overhaul UI ideas — validated backlog

**Date:** 2026-05-29  

**Implementation tracking:** [fix-backlog-2026-05-29.md](fix-backlog-2026-05-29.md)

**Method:** Local browser (`http://127.0.0.1:5173`) + Worker API + code review  
**Lenses:** [frontend-design](file:///home/debian/.agents/skills/frontend-design/SKILL.md), [crm-ui-overhaul](.cursor/skills/crm-ui-overhaul/SKILL.md), [ui-wireframes.md](../project_requirements/ui-wireframes.md), [ui-ux-audit-2026-05-29.md](ui-ux-audit-2026-05-29.md)

---

## Summary

| Status | Count |
|--------|------:|
| SKIP_FIXED | 1 |
| REVISE | 4 |
| ACCEPT | 14 |
| IGNORE | 3 |
| DUPLICATE (audit) | 5 |
| DOCS_ONLY | 3 |
| NOT_REPRODUCED | 1 |
| **New audit issues added** | 3 (#25–#27) |

---

## Master table

| ID | Original idea (short) | Verdict | Status | Audit # |
|----|----------------------|---------|--------|---------|
| I1 | Branding at login | PARTIAL | REVISE | #3 |
| I2 | Demo credentials on login | PARTIAL | REVISE | #4 |
| I3 | Scroll / height (dashboard **and** pipeline) | TRUE | ACCEPT | **#25–#27** (new) |
| I4 | Pagination clients table | TRUE | ACCEPT | #7, #8 |
| I5 | Create client error then duplicate email | PARTIAL | ACCEPT | — |
| I6 | Sort clients table | TRUE | ACCEPT | — |
| I7 | Date created column | TRUE | REVISE | — |
| I8 | Clickable table row | TRUE | ACCEPT | — |
| I9 | Last activity + sort | TRUE | IGNORE | — |
| I10 | Sales clients filter (mine/all/unassigned) | TRUE | ACCEPT | — |
| I11 | Pipeline “Move to” label | TRUE | ACCEPT | #5, #19 |
| I12 | Profile button chevron | TRUE | ACCEPT | — |
| I13 | Dropdown transparent / unreadable | FALSE* | NOT_REPRODUCED | #13† |
| I14 | Sales queue more detail (created) | TRUE | ACCEPT | — |
| I15 | Client conversation list more detail | TRUE | ACCEPT | — |
| I16 | No unread indicator for client | TRUE | ACCEPT | — |
| I17 | Manager conv. filters don’t work | TRUE | ACCEPT | **#25** |
| I18 | Document pipeline statuses | N/A | DOCS_ONLY | — |
| I19 | “Me” / role in brackets | N/A | IGNORE | — |
| I20 | Dashboard tables + paginate owner | TRUE | REVISE | #11 |
| I21 | Deal close/expiry/reopen rules | N/A | DOCS_ONLY | — |
| I22 | Stage rules + limit dropdown | TRUE | DOCS_ONLY + REVISE UI | #5, #22† |
| I23 | Chat: datetime, me, distinguish messages | TRUE | ACCEPT | — |

\* Client role on `/conversations` @ 390×844: dropdown `background: rgb(255,255,255)`, `z-index: 50`. Your report may be intermittent or fixed; re-check on full crawl.  
† Audit #13 tracked styling; not reproduced this pass.

---

## Detail by idea

### I1 — Branding at login
- **Verdict:** PARTIAL  
- **Status:** REVISE (not SKIP — mobile still weak)  
- **Evidence:** Desktop 1280×720: brand panel visible (`lg:flex`, teal gradient, Fraunces headline, logo). Mobile 390×844: `hasLeftBrand: false` — only form card.  
- **Proposed:** Add compact mobile hero (logo + tagline) per audit #3. Desktop branding already meets crm-ui-overhaul direction.

### I2 — Demo credentials on login
- **Verdict:** PARTIAL  
- **Status:** REVISE  
- **Evidence:** Footer text: “Demo accounts available · Password: demo1234”. No `manager1@demo.local` / `sales1@demo.local` / `client1@demo.local`.  
- **Proposed:** Collapsible demo-account list on login card (static copy). Duplicate audit #4.

### I3 — Page taller than viewport (dashboard **and** pipeline)
- **Verdict:** TRUE for **both**  
- **Status:** ACCEPT  
- **Evidence (CDP @ 1280×720):**
  - `/dashboard`: `scrollHeight` **1591** vs viewport **720** → page scroll.
  - `/pipeline`: `scrollHeight` **2349** vs viewport **720** → worse; kanban has `overflow-x-auto` but many cards stack vertically in columns.
- **Proposed:**  
  - **Pipeline:** Prefer `max-h-[calc(100vh-<header>)]` on board + **internal** vertical scroll per column + horizontal scroll for stages (avoid whole-page 2300px scroll).  
  - **Dashboard:** Cap “Recent activity” height with `ScrollArea`, or paginate activity.  
- **New audit issues:** #26 (pipeline), #27 (dashboard). See [ui-ux-audit-2026-05-29.md](ui-ux-audit-2026-05-29.md).

### I4 — Pagination for clients table
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** [`ClientsPage.tsx`](../src/pages/ClientsPage.tsx) renders full table; no page size control. Long list with E2E seed data.  
- **Proposed:** shadcn pagination or “Load more” (e.g. 25 rows). Aligns with audit #7/#8.

### I5 — Create client shows error; retry says email exists; row in table
- **Verdict:** PARTIAL (API behaves correctly)  
- **Status:** ACCEPT (UX)  
- **Evidence:** API test as `sales1@demo.local`: first POST → **201** + id; second POST same email → **409** “Client with this email already exists”. Matches “row exists + second click fails.”  
- **Likely cause:** Double submit or success path not closing dialog / not clearing error.  
- **Proposed:** On 201: close dialog, toast success, invalidate list. Disable submit while pending. Map 409 to friendly inline message. Do not change API contract.

### I6 — Sorting on clients table
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** No sort headers in table UI.  
- **Proposed:** Sortable column headers (name, email, target country, active deal) — client-side for current list or server-side if pagination added.

### I7 — Date client created
- **Verdict:** TRUE (data exists, UI missing)  
- **Status:** REVISE (optional / not in requirements)  
- **Evidence:** API `mapClient` returns `createdAt`; [`ClientListItem`](../src/features/clients/types.ts) type omits it but JSON includes it.  
- **Proposed:** Add column + extend type. Recommend **include** if you add pagination/sort.

### I8 — Whole row clickable
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** Only name cell is `<Link>` in table.  
- **Proposed:** `TableRow` `onClick` + `cursor-pointer` or wrap row; preserve keyboard access.

### I9 — Last activity shorthand + sort
- **Verdict:** TRUE (not implemented)  
- **Status:** IGNORE (unless product priority)  
- **Reason:** Requires API field for “last activity” on list DTO, not only `activeDealTitle`. Higher scope than I7. Defer to post-MVP.

### I10 — Sales clients: filter mine / all / unassigned
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** Worker supports `?ownerId=` ([`clients.ts`](../worker/src/routes/clients.ts)); UI [`fetchClients`](../src/features/clients/api.ts) never passes `ownerId`. Sales sees full list.  
- **Proposed:** Queue-style tabs: **Mine** (deals/clients owned by me), **Unassigned** (no owner / no active deal — define rule), **All**. Prefer **single table + filter** over three tables (less cognitive load). Wire `ownerId` from auth profile.

### I11 — Pipeline label “Move to”
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** Per-card native `<select>` with `aria-label` only; no visible “Move to” label.  
- **Proposed:** Visible `<Label>` or placeholder on shadcn `Select`. Duplicate audit #5/#19 styling pass.

### I12 — Profile button affordance (chevron)
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** [`AppShell.tsx`](../src/components/layout/AppShell.tsx) — Avatar + name only, no `ChevronDown`.  
- **Proposed:** Add `ChevronDown` icon; `aria-haspopup="menu"`.

### I13 — Dropdown transparent / unreadable
- **Verdict:** FALSE in this pass  
- **Status:** NOT_REPRODUCED  
- **Evidence:** Client `/conversations`, menu open: `bg-popover` white, opacity 1, z-index 50.  
- **Action:** Re-test on full crawl (mobile + scroll). If seen again, fix global `DropdownMenuContent` / stacking context. Related audit #13 — keep on list with lower confidence.

### I14 — Sales queue: more detail (e.g. created)
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** List shows subject + assignee name only. DB/API fetch `created_at` but [`mapThreadListItem`](../worker/src/services/conversationsService.ts) drops it.  
- **Proposed:** Expose `createdAt` / `lastMessageAt` in list DTO; show relative time under subject (“2d ago”).

### I15 — Client conversation list: more detail
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** Same as I14; client sees “subject + open” only.  
- **Proposed:** Show `lastMessageAt` relative time; optional unread dot (see I16).

### I16 — No visual feedback when reply arrives (client)
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** No `unread` / `read_at` in schema or UI grep.  
- **Proposed:** Unread badge on thread row; bold subject; optional browser notification later. Needs backend `last_read_at` or message-level read cursor — **confirm scope** before implementation (may touch API).

### I17 — Manager conversation filters ineffective
- **Verdict:** TRUE  
- **Status:** ACCEPT → **Audit #25**  
- **Evidence:** API counts as manager: `unassigned` **21**, `mine` **21**, `all` **21**, none **21**. Backend comment: `// manager: no filter (all threads)`. UI tabs change active state but list content is effectively “all threads always.”  
- **Proposed:** Implement manager queue semantics in [`conversationsService.ts`](../worker/src/services/conversationsService.ts) (unassigned = `assigned_to is null`, mine = assigned to manager, all = no filter) **or** remove tabs for manager and show label “All conversations.”

### I18 — Document pipeline status definitions
- **Verdict:** N/A (not a UI bug)  
- **Status:** DOCS_ONLY  
- **Proposed:** Add `docs/pipeline-stages.md` with stage meanings, entry/exit criteria, who moves. Mandatory per your note.

### I19 — “Me” / role in brackets
- **Verdict:** N/A  
- **Status:** IGNORE (low priority)  
- **Reason:** Product copy; risk of confusion in audit logs. Revisit after I23 chat labeling.

### I20 — Dashboard deals by owner/stage: table pagination
- **Verdict:** TRUE (growth risk)  
- **Status:** REVISE  
- **Evidence:** Side-by-side tables; owner list can grow; no pagination.  
- **Proposed:** Fixed-height card + `ScrollArea` for owner table; keep stage table fixed row count (8 stages). Full pagination optional Phase 2. Overlaps audit #11.

### I21 — Deal close/expiry/auto-close/reopen
- **Verdict:** N/A  
- **Status:** DOCS_ONLY  
- **Evidence:** Stages `won` / `lost` exist; no auto-expiry in worker. Lost reason free text (audit #10 bug on visibility).  
- **Proposed:** Document lifecycle in `docs/deal-lifecycle.md`. UI: lost-reason presets + “Other” — after fixing #10.

### I22 — Stage prerequisites and transition order
- **Verdict:** TRUE (no enforcement today)  
- **Status:** DOCS_ONLY + REVISE UI optional  
- **Evidence:** [`patchStage`](../worker/src/services/dealsService.ts) accepts any stage; pipeline select lists all stages.  
- **Proposed:** Document allowed transitions in same doc as I18. UI Phase 2: restrict dropdown options to valid next stages (+ always `lost`).

### I23 — Chat too basic (datetime, me, distinguish)
- **Verdict:** TRUE  
- **Status:** ACCEPT  
- **Evidence:** [`ConversationPage.tsx`](../src/pages/ConversationPage.tsx) — messages show “Client/Team: {name}” + body; `createdAt` on message not rendered.  
- **Proposed:** Show timestamp per bubble; “You” for current user; stronger bubble contrast (already left/right aligned).

---

## Consolidated implementation list (for single fix pass)

Deduped with audit #1–#24. New numbers **P1…** — merge when triaging.

| P# | Source | Action |
|----|--------|--------|
| P1 | I5 | Create-client dialog: close on success, disable double submit, clear 409 message |
| P2 | I17 / #25 | Manager conversation queue filters (backend + UI) or hide tabs |
| P3 | I3 / #26–#27 | Pipeline board + dashboard scroll containment |
| P4 | I4, I6, I8, I7 | Clients table: pagination, sort, row click, optional created column |
| P5 | I10 | Sales clients owner/queue filter (wire `ownerId`) |
| P6 | I11, I22-ui, audit #5 | shadcn Select + “Move to” label; optional stage transition limits |
| P7 | I12 | Profile menu chevron + a11y |
| P8 | I13 | Dropdown stacking (if reproduced on crawl) |
| P9 | I14, I15 | Conversation list metadata (timestamps) |
| P10 | I16 | Client unread state (API + UI — confirm scope) |
| P11 | I23 | Message bubbles: time, “You”, clearer roles |
| P12 | I1, I2, audit #3–#4 | Login mobile branding + demo email list |
| P13 | I20, audit #11 | Dashboard owner table scroll/pagination |
| P14 | audit #1, #6, #10, etc. | From [audit report](ui-ux-audit-2026-05-29.md) — same pass |
| P15 | I18, I21, I22-docs | Documentation only (no code or docs-only sprint first) |

**Ignore unless you override:** I9, I19.

---

## Additions to audit report (issues 25–27)

Appended to [ui-ux-audit-2026-05-29.md](ui-ux-audit-2026-05-29.md) § “Issues from pre-overhaul validation”.

---

*Reference `I#` for idea lineage, `P#` for fix pass, audit `#` for original crawl.*
