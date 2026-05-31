# Full crawl session log — 2026-05-29

**Script:** `scripts/crawl-ui-audit-v2.mjs`  
**Output:** `docs/reports/ui-ux-audit-screenshots/` (65 PNGs), `docs/reports/crawl-metrics-2026-05-29.json` (57 rows)

## Runs

| Run | Notes |
|-----|--------|
| v1 | Shared browser context → sales/client P02–P03 briefly recorded `/dashboard` (session bleed). |
| v2 | Isolated context per role + `localStorage.clear()` on login + wait for role home URL. Metrics use actual `location.pathname`. |

## Credentials

| Role | Email | Password |
|------|-------|----------|
| Manager | `manager1@demo.local` | `demo1234` |
| Sales | `sales1@demo.local` | `demo1234` |
| Client | `client1@demo.local` | `demo1234` |

**IDs:** `clientId` = `c99ad53e-b218-48fc-b1c3-7449a2580666`, `dealId` = `3fe6f24b-bce0-48f8-a686-f8ee0198e3fb`, `threadId` = `51880ffc-4449-4e3d-9cbe-6e4458dbb0ba`

## Coverage matrix (v2)

| Page | Manager D/M | Sales D/M | Client D/M | Actual paths (v2) |
|------|-------------|-----------|------------|-------------------|
| P01 | — | — | unauth D/M | `/login` |
| P02 | D/M | D/M | D/M | `/dashboard`, `/clients`, `/conversations` |
| P03 | D/M | D/M | D/M | same redirects as P02 |
| P04 | D/M + dialog | D/M + dialog | D/M | `/clients` |
| P05 | D/M | D/M | D/M | `/clients/:id` |
| P06 | D/M + mine/unassigned tabs | D/M | D/M | `/conversations` |
| P07 | D/M | D/M | D/M | `/conversations?thread=…` |
| P08 | D/M | D/M | D/M | `/pipeline` (client: no redirect) |
| P09 | D/M | D/M | — | `/deals/:id` |
| P10 | menu desktop | menu desktop | menu + I13 mobile | `/conversations` |
| P11 | D/M | D/M | D/M | unknown → role home |

## Issue checks during crawl

| ID | Result |
|----|--------|
| I13 (mobile profile menu contrast) | **NOT_REPRODUCED** — `I13-client-profile-menu-mobile.png` shows normal dropdown surface |
| I3 (dashboard/pipeline scroll) | **CONFIRMED** — manager dashboard scrollH ~1606/2474; pipeline ~2465/2680 |
| I17 / #25 (manager queue filters) | **CONFIRMED** — API-level; tab screenshots `P06-conversations-manager-*-tab-desktop.png` |
| #16 (client pipeline) | **REVISED** — client stays on `/pipeline`, not redirect |

## Re-run

```bash
# Terminals: npm run dev (5173) + worker (8787)
node scripts/crawl-ui-audit-v2.mjs
```
