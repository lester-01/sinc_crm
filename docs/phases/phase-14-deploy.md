# Phase 14 — Deploy

**Status:** Complete (docs + scripts; live URLs filled by you at deploy time)  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [deploy-guide](../deploy-guide.md) · [build-plan](../build-plan.md)

---

## Goal

Production deployment path for **Cloudflare Worker** + **Cloudflare Pages**, full **`docs/deploy-guide.md`**, verify script, optional `@deploy` smoke tests.

**Deploy method today:** manual CLI (`npm run deploy:worker`, `deploy:pages`). **Also valid later:** GitHub → Cloudflare (Pages git integration + Actions for Worker). The repo will support both; only the CLI path is documented for manual deploy now. End-to-end two-pass script is planned after manual deploy is proven.

---

## Deliverables

| Item | Status |
|------|--------|
| `docs/deploy-guide.md` | Done — two-pass manual deploy guide |
| `scripts/deploy-worker.sh`, `scripts/deploy-pages.sh` | Done |
| `npm run deploy:worker`, `deploy:pages`, `deploy` | Done |
| `.env.production.example` | Done |
| `verify:stack:deploy` uses `/api/health` | Done |
| `e2e/specs/phase-14-deploy.spec.ts` (`DEPLOY-01`, `DEPLOY-02`) | Done — skipped without `DEPLOY_*` URLs |
| README deploy section | Template — fill live URLs after deploy |
| `npm run deploy:all` / `deploy:all:skip-db` | Done — see [deploy-guide.md](../deploy-guide.md#one-command-deploy-deployall) |

---

## Deploy order (summary)

See [deploy-guide.md](../deploy-guide.md) for full detail.

**Pass 1**

1. Supabase: `db:schema` (required); `db:seed` (optional, demo)  
2. Worker secrets: `SUPABASE_URL`, `SUPABASE_SECRET_KEY`  
3. `npm run deploy:worker` → note Worker URL  
4. `.env.production` → `npm run deploy:pages` → note **stable** Pages URL (not preview hash URL)  

**Pass 2**

5. `CORS_ORIGINS` secret = Pages URL  
6. Supabase Dashboard → Authentication → URL configuration  
7. `npm run verify:stack:deploy`  
8. Optional: `DEPLOY_*` Playwright smoke  
9. README URL table (URLs from `deploy:all` API summary)

---

## Verify

```bash
npm run deploy:worker
npm run deploy:pages
# Pass 2: CORS + Supabase Auth URLs — see deploy-guide.md
npm run verify:stack:deploy

# Optional (after URLs exist; needs seed for DEPLOY-02):
DEPLOY_PAGES_URL=https://....pages.dev \
DEPLOY_API_URL=https://....workers.dev \
npx playwright test e2e/specs/phase-14-deploy.spec.ts
```

---

## Handoff to Phase 15

- Record deployed URLs in README  
- Optional portfolio walkthrough on production Pages URL  
- Launch checklist: [phase-15-submission.md](./phase-15-submission.md) (to be created)
