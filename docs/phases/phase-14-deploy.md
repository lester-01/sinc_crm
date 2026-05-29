# Phase 14 — Deploy

**Status:** Complete (docs + scripts; live URLs filled by you at deploy time)  
**Started:** 2026-05-27  
**Completed:** 2026-05-27

Links: [deploy-guide](../deploy-guide.md) · [build-plan](../build-plan.md)

---

## Goal

Production deployment path for **Cloudflare Worker** + **Cloudflare Pages**, full **`docs/deploy-guide.md`**, verify script, optional `@deploy` smoke tests.

---

## Deliverables

| Item | Status |
|------|--------|
| `docs/deploy-guide.md` | Done — step-by-step |
| `scripts/deploy-worker.sh`, `scripts/deploy-pages.sh` | Done |
| `npm run deploy:worker`, `deploy:pages`, `deploy` | Done |
| `.env.production.example` | Done |
| `verify:stack:deploy` uses `/api/health` | Done |
| `e2e/specs/phase-14-deploy.spec.ts` (`DEPLOY-01`, `DEPLOY-02`) | Done — skipped without `DEPLOY_*` URLs |
| README deploy section | Template — fill live URLs after deploy |

---

## Deploy order (summary)

1. Supabase schema + seed on production project  
2. `wrangler secret put` — `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `CORS_ORIGINS`  
3. `npm run deploy:worker`  
4. `.env.production` with Worker URL → `npm run deploy:pages`  
5. Supabase Auth redirect URLs + CORS secret if needed  
6. `npm run verify:stack:deploy`  
7. Optional: `DEPLOY_PAGES_URL` + `DEPLOY_API_URL` playwright smoke  

---

## Verify

```bash
npm run deploy:worker
npm run deploy:pages
npm run verify:stack:deploy

# Optional (after URLs exist):
DEPLOY_PAGES_URL=https://....pages.dev \
DEPLOY_API_URL=https://....workers.dev \
npx playwright test e2e/specs/phase-14-deploy.spec.ts
```

---

## Handoff to Phase 15

- Record deployed URLs in README  
- Demo video on production Pages URL  
- Submission checklist: [phase-15-submission.md](./phase-15-submission.md) (to be created)
