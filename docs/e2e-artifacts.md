# E2E run artifacts & reporting

Every **isolated** E2E run (`npm run test:e2e`) produces a dated session folder with **per-test subfolders** for review.

Related: [testing-guide.md](./testing-guide.md), [testing-plan.md](./testing-plan.md), [ci-e2e-recipe.md](./ci-e2e-recipe.md)

---

## Isolated run pipeline

```txt
1. Create Supabase project   name: sinc-ci-e2e-<timestamp-or-run-id>
2. Write ephemeral env       .e2e-run.env (gitignored)
3. db:schema + db:seed
4. Start Vite + Worker       Playwright webServer
5. Run Playwright tests
6. Generate reports          console + per-test folders + HTML summary
7. Cleanup                   delete Supabase project (always(), even on failure)
```

**Dev project credentials** in root `.env` are **not** used for runtime during default isolated E2E runs. The orchestrator reads `.env` only for `SUPABASE_ACCESS_TOKEN` and `SUPABASE_ORG_SLUG`, writes ephemeral keys to `.e2e-run.env`, and passes that file to schema/seed, Vite, Worker, and Playwright fixtures via `E2E_ENV_FILE`.

Optional fast path: `npm run test:e2e:dev` — tests against existing dev Supabase (no create/delete; uses root `.env` only).

---

## Commands

| Script | Purpose |
|--------|---------|
| `npm run test:e2e` | Isolated run, headless, full pipeline + artifacts |
| `npm run test:e2e:ui` | Same pipeline, Playwright UI mode |
| `npm run test:e2e:dev` | Use current `.env` (no DB create/delete) |
| `npm run test:e2e -- --grep @phase8` | Isolated subset |

Orchestrator: `scripts/e2e-run.mjs`.

---

## Session folder layout

Root: **`test-results/`** (gitignored)

```txt
test-results/
  2026-05-27_14-30-22/
    run.json
    run.log
    summary.html
    playwright-report/
    tests/
      AUTH-01-manager-login/
        meta.json
        test.log
        screenshots/
        trace.zip
```

Test IDs match [testing-guide.md](./testing-guide.md) (`AUTH-01`, `CHAT-07`, …).

---

## Environment files (isolated runs)

| File | Purpose |
|------|---------|
| `.env` | **Orchestration only** — `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_SLUG` to create/delete ephemeral projects |
| `.e2e-run.env` | **Runtime** — ephemeral `SUPABASE_*`, `VITE_API_BASE_URL`, etc. Written each run; deleted on cleanup |

Vite, Wrangler, db scripts during the run, and `e2e/fixtures/api-auth.ts` merge `.env` + `E2E_ENV_FILE` (overlay wins). Specs must use `api-auth` helpers — do not parse `.env` directly in tests.

---

## Credentials for isolated runs

**E2E only** — not required for `npm run dev`.

| Variable | File | Purpose |
|----------|------|---------|
| `SUPABASE_ACCESS_TOKEN` | root `.env` | Create/delete `sinc-ci-e2e-*` projects |
| `SUPABASE_ORG_SLUG` | root `.env` | Org slug for new projects |

Runtime keys (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, …) are written to `.e2e-run.env` automatically. See [playwright-wsl-setup.md](./playwright-wsl-setup.md).

---

## Reviewing results

1. Open `test-results/<latest-session>/summary.html`
2. Or run `npm run test:e2e:ui` during development
3. Per failure: open `tests/<TEST-ID>/screenshots/` and `trace.zip`

Do not commit `test-results/`.
