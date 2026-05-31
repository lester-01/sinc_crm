# SINC CRM — UI/UX Audit Report

**Date:** 2026-05-29  
**Environment:** Local — `http://127.0.0.1:5173` (Vite) + `http://127.0.0.1:8787` (Worker API)  
**Viewports:** Desktop **1280×720** and mobile **390×844** (Playwright + earlier Cursor IDE Browser CDP)  
**Roles tested:** Manager (`manager1@demo.local`), Sales (`sales1@demo.local`), Client (`client1@demo.local`)  
**Password:** `demo1234`  
**Evaluation lens:** [frontend-design skill](file:///home/debian/.agents/skills/frontend-design/SKILL.md), [crm-ui-overhaul skill](.cursor/skills/crm-ui-overhaul/SKILL.md), [ui-wireframes.md](../project_requirements/ui-wireframes.md)

**Implementation tracking:** [fix-backlog-2026-05-29.md](fix-backlog-2026-05-29.md) (canonical FIX-### checklist).

**Crawl v2 (complete):** [`scripts/crawl-ui-audit-v2.mjs`](../scripts/crawl-ui-audit-v2.mjs) — **57 metric rows**, **65 PNGs** in [`ui-ux-audit-screenshots/`](ui-ux-audit-screenshots/), metrics in [`crawl-metrics-2026-05-29.json`](crawl-metrics-2026-05-29.json). Session log: [`crawl-session-2026-05-29.md`](crawl-session-2026-05-29.md). Ideas validation: [`ui-improvement-backlog-validated-2026-05-29.md`](ui-improvement-backlog-validated-2026-05-29.md).

---

## Executive summary

| Metric | Count |
|--------|------:|
| Global issues | 27 (#1–#27; #16 revised in v2) |
| High severity | 4 (#6, #8, #10, #25) |
| Medium severity | 16 (#16 revised to Medium in v2) |
| Low severity | 7 |
| Pages with desktop + mobile screenshots (390×844) | P01–P11 (all roles applicable) |
| Supplementary shots | P10 profile menus (desktop), P06 queue tabs, P04 New Client dialogs, I13 mobile menu |

**Top themes**

1. **Wireframe gaps** — Global header search is disabled; pipeline owner filter uses raw UUID instead of a name dropdown.
2. **Component consistency** — Multiple flows use native `<select>` instead of shadcn `Select`, breaking visual cohesion.
3. **Scale / clutter** — E2E seed data exposes weak list UX (duplicate names, unbounded history, no pagination).
4. **Copy & affordance** — Lost-reason field shown at wrong times; client-facing copy still says “sales team.”
5. **Mobile login** — Brand storytelling panel is desktop-only (`lg:flex`).

Screenshots live in [`ui-ux-audit-screenshots/`](ui-ux-audit-screenshots/) (canonical). Crawl v2 re-ran with **isolated browser context per role** (fixes v1 session bleed that briefly showed sales/client on `/dashboard`).

---

## Page coverage table (crawl v2)

| ID | Route | Manager | Sales | Client | Desktop | Mobile (390×844) | Status |
|----|-------|---------|-------|--------|---------|------------------|--------|
| P01 | `/login` | — | — | unauth | Done | Done | **Completed** |
| P02 | `/` (role home) | → `/dashboard` | → `/clients` | → `/conversations` | Done | Done | **Completed** (OK) |
| P03 | `/dashboard` | Full | Redirect → `/clients` | Redirect → `/conversations` | Done | Done | **Completed** |
| P04 | `/clients` | Full + dialog shot | Full + dialog | 1 row (own) | Done | Done | **Completed** |
| P05 | `/clients/:id` | `c99ad53e-…` | Same ID | Same ID | Done | Done | **Completed** |
| P06 | `/conversations` | Queues + tabs shots | Queues | No queue tabs | Done | Done | **Completed** |
| P07 | `/conversations?thread=` | Deep link | Deep link | Deep link | Done | Done | **Completed** |
| P08 | `/pipeline` | Full kanban | Owner-filtered | **Direct URL loads** (no nav) | Done | Done | **Completed** |
| P09 | `/deals/:id` | `3fe6f24b-…` | Same deal | Not in crawl matrix | Done | Done | **Completed** |
| P10 | App shell | Menu desktop | Menu desktop | Menu + I13 mobile | Done | Partial† | **Completed** |
| P11 | Unknown route | → role home | → role home | → role home | Done | Done | **Completed** |

†P10: profile dropdown captured on **desktop** for all roles; **I13** mobile profile menu (`I13-client-profile-menu-mobile.png`). Mobile hamburger nav not separately shot — low risk; shell chrome visible on every page mobile shot.

**Discovered IDs:** `clientId` = `c99ad53e-b218-48fc-b1c3-7449a2580666` (Aida Client), `dealId` = `3fe6f24b-bce0-48f8-a686-f8ee0198e3fb` (Germany application).

---

## Global numbered issues

### Issue 1
- **Page:** P10 App shell (all roles)
- **Severity:** Medium
- **Category:** Wireframe / Copy
- **What:** Header search input is visible but `disabled` with placeholder “Search…” and no explanation.
- **Why it matters:** Wireframe shows a search field; users may think the app is broken or their role lacks permissions.
- **Suggested fix:** Either implement global search, remove the control from the shell until ready, or show a `Tooltip` / `aria-describedby` (“Coming soon”) on the disabled field. UI-only in [`AppShell.tsx`](../src/components/layout/AppShell.tsx).

### Issue 2
- **Page:** P10 App shell (desktop ~1280px)
- **Severity:** Low
- **Category:** Layout
- **What:** Primary nav can clip the “Conversations” label (observed as “Conversatio…” in viewport).
- **Why it matters:** Reduces scanability and looks unfinished at common laptop widths.
- **Suggested fix:** Shorten labels on `md` breakpoints, use icon+text, or allow nav wrap/`text-overflow` with min-width on items in [`AppShell.tsx`](../src/components/layout/AppShell.tsx).

### Issue 3
- **Page:** P01 Login (mobile)
- **Severity:** Medium
- **Category:** Layout / Typography
- **What:** Left brand panel (gradient, headline, demo hint) is `hidden` below `lg` — mobile users only see the form card.
- **Why it matters:** Login is the first brand touchpoint; mobile loses the distinctive CRM story the skill expects.
- **Suggested fix:** Add a compact mobile hero above the card (logo + one-line tagline + demo hint) in [`LoginPage.tsx`](../src/pages/LoginPage.tsx).

### Issue 4
- **Page:** P01 Login
- **Severity:** Low
- **Category:** Copy
- **What:** Demo hint shows password only, not sample emails (`manager1@demo.local`, etc.).
- **Why it matters:** Slows first-time evaluators and demo users.
- **Suggested fix:** Add a collapsible “Demo accounts” list under the hint (static copy, no logic change).

### Issue 5
- **Page:** P06, P07, P09 (manager/sales)
- **Severity:** Medium
- **Category:** Wireframe / Layout
- **What:** Reassign and stage controls use native `<select>` instead of shadcn `Select`.
- **Why it matters:** Inconsistent with crm-ui-overhaul (“use shadcn”); styling, focus rings, and keyboard UX differ from the rest of the app.
- **Suggested fix:** Replace with `Select` from shadcn in [`ConversationPage.tsx`](../src/pages/ConversationPage.tsx), [`DealDetailPage.tsx`](../src/pages/DealDetailPage.tsx), [`PipelinePage.tsx`](../src/pages/PipelinePage.tsx).

### Issue 6
- **Page:** P08 Pipeline (manager)
- **Severity:** High
- **Category:** Wireframe
- **What:** Owner filter is a text field “Filter by owner UUID” instead of wireframe’s “Owner [ All ▼ ]” with human names.
- **Why it matters:** Managers cannot realistically filter by UUID; feature is effectively unusable.
- **Suggested fix:** Populate a `Select` from `useTeamMembers` (same as deal reassign) with “All owners” default. UI + existing hook only in [`PipelinePage.tsx`](../src/pages/PipelinePage.tsx).

### Issue 7
- **Page:** P04 Clients (manager/sales)
- **Severity:** Medium
- **Category:** Layout / Copy
- **What:** Many rows share the same display name (“API Sales Client”, “E2E New Client”) — only email column differentiates.
- **Why it matters:** Accessibility tree exposes duplicate link names; users cannot distinguish rows quickly.
- **Suggested fix:** Show email as secondary line under name in the name cell, or append `targetCountry` / truncated email in the link text (presentation only).

### Issue 8
- **Page:** P05 Client detail
- **Severity:** High
- **Category:** Layout
- **What:** Conversations and Deals lists render all items with no pagination, virtualisation, or “Show more.”
- **Why it matters:** With seeded E2E data, page becomes an extremely long scroll; hurts performance perception and findability.
- **Suggested fix:** Cap visible items (e.g. 5) with “View all in Conversations/Pipeline” links, or paginate inside `ScrollArea` in [`ClientDetailPage.tsx`](../src/pages/ClientDetailPage.tsx).

### Issue 9
- **Page:** P05 Client detail
- **Severity:** Medium
- **Category:** Wireframe
- **What:** Activity feed shows `description` only; `createdAt` exists in API types but is not rendered.
- **Why it matters:** Wireframe implies a timeline; users cannot tell when events occurred.
- **Suggested fix:** Add `text-xs text-muted-foreground` timestamp under each activity line using `a.createdAt`.

### Issue 10
- **Page:** P09 Deal detail
- **Severity:** High
- **Category:** Copy / Layout
- **What:** “Lost reason” input is shown whenever `deal.stage !== "lost"` (inverted condition), including when stage is `won`.
- **Why it matters:** Confusing and noisy; contradicts placeholder text.
- **Suggested fix:** Only render lost-reason field when selected stage is `lost` (or deal is already lost). Fix condition in [`DealDetailPage.tsx`](../src/pages/DealDetailPage.tsx) line ~138.

### Issue 11
- **Page:** P03 Dashboard, P09 Deal detail
- **Severity:** Medium
- **Category:** Layout
- **What:** Recent activity / stage history lists grow without limit (20+ duplicate stage toggles observed on Germany deal).
- **Why it matters:** Cognitive overload; hard to see current state.
- **Suggested fix:** Show latest N entries with expand, or collapse duplicate consecutive transitions in presentation layer.

### Issue 12
- **Page:** P06 Conversations (client)
- **Severity:** Low
- **Category:** Layout
- **What:** “First message” in new conversation flow uses single-line `Input` instead of `Textarea`.
- **Why it matters:** Students often send multi-sentence first messages; wireframe shows a message area.
- **Suggested fix:** Use `Textarea` with `rows={3}` in client new-conversation form in [`ConversationPage.tsx`](../src/pages/ConversationPage.tsx).

### Issue 13
- **Page:** P06 / P07 Conversations (mobile)
- **Severity:** Medium
- **Category:** Layout
- **What:** Two-column queue + thread layout (`lg:grid-cols-[…]`) stacks on mobile; thread panel below long queue list.
- **Why it matters:** Selecting a thread requires excessive scrolling on small screens.
- **Suggested fix:** On mobile, hide queue when thread selected with back button, or use `Sheet` for thread detail.

### Issue 14
- **Page:** P03 Dashboard
- **Severity:** Low
- **Category:** Wireframe / Motion
- **What:** KPI cards are not clickable; no drill-down to Conversations/Pipeline filtered views.
- **Why it matters:** Missed opportunity for faster manager workflows (optional wireframe enhancement).
- **Suggested fix:** Wrap cards in `Link` or `button` to filtered routes (e.g. Open Chats → `/conversations` queue).

### Issue 15
- **Page:** P04 Clients (client role)
- **Severity:** Medium
- **Category:** Copy
- **What:** Page description: “Search and manage student profiles across your sales team” shown to clients.
- **Why it matters:** Wrong audience; undermines trust for student users.
- **Suggested fix:** Role-specific `PageHeader` description via `useAuth().role` in [`ClientsPage.tsx`](../src/pages/ClientsPage.tsx).

### Issue 16 *(revised crawl v2)*
- **Page:** P08 Pipeline (client)
- **Severity:** Medium
- **Category:** Wireframe / RBAC UX
- **What:** Client can open `/pipeline` directly; page stays on pipeline (no redirect). Nav hides Pipeline, but route is unguarded — empty/filtered board (~2225px scroll, 0 stage selects vs 18 for manager). Screenshots: `P08-client-desktop.png`, `P08-client-mobile.png`.
- **Why it matters:** Clients may see internal sales tooling or confusing empty kanban; contradicts “clients only see clients + conversations.”
- **Suggested fix:** Mirror `DashboardPage` — `<Navigate to={defaultPathForRole(role)} />` for `client` in [`PipelinePage.tsx`](../src/pages/PipelinePage.tsx), or a role-denied empty state.

### Issue 17
- **Page:** P10 App shell (mobile)
- **Severity:** Low
- **Category:** Layout
- **What:** Duplicate navigation: compact header row plus second horizontal nav strip (`md:hidden` block).
- **Why it matters:** Consumes vertical space; two tap targets for same destinations.
- **Suggested fix:** Consider single bottom nav or hamburger `Sheet` on mobile in [`AppShell.tsx`](../src/components/layout/AppShell.tsx).

### Issue 18
- **Page:** P03 Dashboard
- **Severity:** Low
- **Category:** Typography
- **What:** Recent activity timestamps rendered as full `Badge` components.
- **Why it matters:** Heavy visual weight for metadata; competes with activity text.
- **Suggested fix:** Use plain `text-xs text-muted-foreground` instead of `Badge` in [`DashboardPage.tsx`](../src/pages/DashboardPage.tsx).

### Issue 19
- **Page:** P08 Pipeline
- **Severity:** Medium
- **Category:** Layout
- **What:** Each kanban card includes a stage `<select>` duplicating the column’s stage.
- **Why it matters:** Redundant control; card height noise; easy to mis-click when scrolling horizontally.
- **Suggested fix:** Drag-and-drop between columns (future) or single stage control on card expand; until then, hide select when card is in “correct” column and offer “Move…” menu.

### Issue 20
- **Page:** P09 Deal detail
- **Severity:** Low
- **Category:** Accessibility
- **What:** Stage `<select>` exposes raw values in a11y tree (`won`, `new lead`) mixed with labels.
- **Why it matters:** Screen reader experience is inconsistent.
- **Suggested fix:** shadcn `Select` with human-readable `SelectItem` text.

### Issue 21
- **Page:** P11 Unknown route
- **Severity:** Low
- **Category:** Copy
- **What:** `*` route in [`router.tsx`](../src/app/router.tsx) redirects to `/` with no 404 message.
- **Why it matters:** Broken bookmarks fail silently.
- **Suggested fix:** Add minimal `NotFoundPage` with link home (UI-only route element).

### Issue 22
- **Page:** P01 Login (desktop)
- **Severity:** Low
- **Category:** Typography
- **What:** Typography pairing (Fraunces display + DM Sans) is distinctive and on-brand; metric numerals use Fraunces at large sizes.
- **Why it matters:** Generally positive; verify tabular alignment for KPIs (`tabular-nums` already on dashboard — good).
- **Suggested fix:** No change required; optional: ensure all stat numbers use `tabular-nums` consistently.

### Issue 23
- **Page:** P05 Client detail (dialogs)
- **Severity:** Low
- **Category:** Layout
- **What:** “New Chat” / “New Deal” dialogs use `Input` for message fields (same as Issue 12 pattern).
- **Why it matters:** Managers/sales may enter longer first messages.
- **Suggested fix:** `Textarea` for `chat-message` in [`ClientDetailPage.tsx`](../src/pages/ClientDetailPage.tsx).

### Issue 24
- **Page:** P10 App shell
- **Severity:** Low
- **Category:** Motion
- **What:** `animate-fade-up` on `<main>` is subtle and appropriate; nav transitions exist. No reduced-motion guard.
- **Why it matters:** `prefers-reduced-motion` users still get transforms.
- **Suggested fix:** Add `@media (prefers-reduced-motion: reduce)` override in [`index.css`](../src/index.css) to disable `fade-up`.

---

## Per-page mini-reports

### P01 — `/login`
**Status:** Issues (#3, #4, #22 partial positive)

**Desktop:** Split layout with teal brand panel and elevated form card works well; distinctive vs generic SaaS. Sign-in and sign-up toggle function correctly.

**Mobile:** Brand panel hidden — see Issue 3. Form remains usable.

**Interactions tested:** Sign in (manager), sign-up mode toggle, return to sign-in.

---

### P02 — `/` (role home redirect)
**Status:** OK

| Role | Lands on |
|------|----------|
| Manager | `/dashboard` |
| Sales | `/clients` |
| Client | `/conversations` |

Redirects match [`nav.ts`](../src/features/auth/nav.ts) `defaultPathForRole`.

---

### P03 — `/dashboard` (manager)
**Status:** Issues (#11, #14, #18)

**Desktop:** Four KPI cards + Deals by Stage/Owner tables + Recent activity — aligns with wireframe structure. Data loads correctly.

**Mobile:** KPI stack is readable; tables require horizontal scroll (acceptable).

**Sales/client:** `/dashboard` redirects away — correct.

**Interactions:** View-only; no dialogs.

---

### P04 — `/clients`
**Status:** Issues (#7, #15)

**Manager/sales:** Search input works; **New Client** dialog opens with full form (Cancel tested). Table matches wireframe columns.

**Client:** Single row (own profile); no New Client button — correct. Wrong description copy — Issue 15.

**Mobile:** Table horizontal scroll likely; name column primary.

---

### P05 — `/clients/:clientId`
**Status:** Issues (#8, #9, #23)

**Manager:** Profile header with avatar, contact card, Conversations/Deals columns, Activity section. **New Deal** / **New Chat** buttons present (dialogs not submitted to avoid seed noise).

**Wireframe gap:** Activity lacks timestamps (Issue 9). Lists overflow (Issue 8).

**Client:** Should only access own ID — verified via API RBAC in code; browser tested manager view on Aida Client.

---

### P06 — `/conversations`
**Status:** Issues (#5, #12, #13)

**Manager:** Unassigned / Mine / All tabs work. Thread list populates; selecting thread shows reassign `<select>` + Reply + Send.

**Sales:** Same queue UI; no Dashboard in nav.

**Client:** “New conversation” toggle; no queue tabs; “Your conversations” queue label — correct.

**Mobile:** Stacked layout — Issue 13.

---

### P07 — `/conversations?thread=:id`
**Status:** Issues (#5, #13)

Deep link tested: `?thread=51880ffc-4449-4e3d-9cbe-6e4458dbb0ba` loads thread with owner line and reply area. Empty Send until reply text entered — correct.

---

### P08 — `/pipeline`
**Status:** Issues (#6, #19)

**Manager/sales:** Kanban columns for all stages with counts; horizontal scroll. Search by deal title works. Owner UUID filter — Issue 6. Per-card stage selects — Issue 19.

**Client:** Nav omits Pipeline; **direct URL still loads pipeline** — Issue 16 (revised). Manager scroll ~2465px desktop; sales ~2465px; client ~2225px.

---

### P09 — `/deals/:dealId`
**Status:** Issues (#5, #10, #11, #20)

**Manager:** Title, client link, value/intake row, stage select, notes, stage history. Lost reason visible on `won` deal — Issue 10. Long history — Issue 11.

**Sales:** Same layout where owner matches (not re-tested on foreign deal in this pass; code enforces in API).

---

### P10 — App shell chrome
**Status:** Issues (#1, #2, #17, #24)

User menu opens with role label and Sign out. Sign out via menu was flaky in automation; clearing `localStorage` + navigate to `/login` worked for role switches.

Gradient accent bar and logo treatment match bold CRM direction from crm-ui-overhaul.

---

### P11 — Unknown route
**Status:** Issue (#21)

`/this-route-does-not-exist` → redirect to `/` (then role home). No user-facing 404.

---

## Positive observations (no issue ID)

- **Color system:** Teal primary + coral accent in [`index.css`](../src/index.css) feels cohesive and on-brand for education sales (not generic purple-gradient slop).
- **Fonts:** DM Sans + Fraunces meet crm-ui-overhaul “avoid Inter/Roboto” guidance.
- **Role-based nav:** Correctly hides Dashboard for sales and Pipeline for clients.
- **RBAC UX:** Client clients list shows only own profile (1 row).
- **shadcn usage:** Cards, dialogs, tables, badges used consistently on main list pages.
- **Loading states:** Skeleton placeholders on dashboard, clients, pipeline.

---

## Appendix

### Tools used
| Tool | Result |
|------|--------|
| Shell `curl` | API health `200`; frontend `200` |
| Cursor IDE Browser MCP | Phase 1: snapshots, CDP metrics, I1–I23 validation, some temp PNGs |
| Playwright [`crawl-ui-audit-v2.mjs`](../scripts/crawl-ui-audit-v2.mjs) | Phase 2: full matrix, repo-local PNGs, [`crawl-metrics-2026-05-29.json`](crawl-metrics-2026-05-29.json) |

### CDP-style metrics (crawl v2 sample)
| Page | Role | Viewport | `path` (actual) | scrollH | overflow | native `<select>` in main |
|------|------|----------|-----------------|--------:|:--------:|--------------------------:|
| P03 | manager | desktop | `/dashboard` | 1606 | yes | 0 |
| P08 | manager | desktop | `/pipeline` | 2465 | yes | 18 |
| P08 | client | desktop | `/pipeline` | 2225 | yes | 0 |
| P02 | sales | mobile | `/clients` | 1511 | yes | 0 |
| P06 | manager | desktop | `/conversations` | — | — | queue tabs: Unassigned/Mine/All identical count (#25) |

### Screenshot index (65 files)
All under [`ui-ux-audit-screenshots/`](ui-ux-audit-screenshots/).

| Pattern | Count | Notes |
|---------|------:|-------|
| `P{01–11}-{role}-{desktop\|mobile}.png` | 54 | Core matrix (unauth uses `P01-unauth-*`) |
| `P10-shell-{role}-menu-desktop.png` | 3 | Profile menu open |
| `P04-clients-{manager\|sales}-new-client-dialog-desktop.png` | 2 | Create client dialog |
| `P06-conversations-manager-{mine\|unassigned}-tab-desktop.png` | 2 | Queue tab states |
| `I13-client-profile-menu-mobile.png` | 1 | I13 dropdown styling check — **NOT_REPRODUCED** (white panel OK) |
| `P03-dashboard-manager-{desktop\|mobile}.png` | 2 | Legacy smoke naming (duplicate of `P03-manager-*`) |
| `smoke-dashboard-desktop.png` | 1 | Early smoke |

**Naming convention:** `P{id}-{role}-{desktop|mobile}.png` — e.g. `P07-sales-mobile.png` = P07 deep-linked thread, sales, 390×844.

Re-run: `node scripts/crawl-ui-audit-v2.mjs` (requires dev servers on `:5173` / `:8787`).

### Known blockers
- None for audit completion. Seed DB contains large E2E datasets which amplify Issues 7, 8, 11 — still valid UX concerns for dev/demo environments.

### Recommended fix-pass order (for your triage)
1. **High:** #10, #6, #8, **#25**  
2. **Medium:** #1, #3, #5, #7, #9, #11, #13, #15, #19, **#26, #27**  
3. **Low:** #2, #4, #12, #14, #16, #17, #18, #20, #21, #23, #24  

---

## Issues from pre-overhaul validation (2026-05-29)

Added while validating user ideas I1–I23. See [ui-improvement-backlog-validated-2026-05-29.md](ui-improvement-backlog-validated-2026-05-29.md).

### Issue 25
- **Page:** P06 Conversations (manager)
- **Severity:** High
- **Category:** Wireframe / Console
- **What:** Queue tabs Unassigned / Mine / All all return the same thread list (API returns 21 threads for every `?queue=` value for managers).
- **Why it matters:** Filters mislead managers; duplicates user idea I17.
- **Suggested fix:** Apply queue filters for `manager` in `worker/src/services/conversationsService.ts`, or remove tabs and label “All conversations.”
- **Idea:** I17

### Issue 26
- **Page:** P08 Pipeline (manager desktop)
- **Severity:** Medium
- **Category:** Layout
- **What:** Page document height ~2349px at 1280×720 viewport — excessive whole-page vertical scroll with many deals in columns.
- **Why it matters:** Hard to orient in kanban; user idea I3 (pipeline option).
- **Suggested fix:** Constrain board to viewport height; per-column vertical scroll; keep horizontal stage scroll.
- **Idea:** I3

### Issue 27
- **Page:** P03 Dashboard (manager desktop)
- **Severity:** Medium
- **Category:** Layout
- **What:** Page document height ~1591px at 1280×720 — content exceeds viewport (metrics + tables + recent activity).
- **Why it matters:** User idea I3 (dashboard option); related to audit #11.
- **Suggested fix:** ScrollArea on recent activity; consider shorter dashboard fold.
- **Idea:** I3

---

*End of report. Reference issue numbers when including or excluding items in the implementation pass.*
