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

**Dev project** (`.env` / `worker/.dev.vars`) is **not** used for default E2E runs.

Optional fast path: `npm run test:e2e:dev` — tests against existing dev Supabase (no create/delete).

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

## Credentials for isolated runs

**E2E only** — not required for `npm run dev`.

| Variable | Purpose |
|----------|---------|
| `SUPABASE_ACCESS_TOKEN` | Create/delete `sinc-ci-e2e-*` projects |
| `SUPABASE_ORG_SLUG` | Org slug for new projects |

Add to `worker/.dev.vars`. See [playwright-wsl-setup.md](./playwright-wsl-setup.md).

---

## Reviewing results

1. Open `test-results/<latest-session>/summary.html`
2. Or run `npm run test:e2e:ui` during development
3. Per failure: open `tests/<TEST-ID>/screenshots/` and `trace.zip`

Do not commit `test-results/`.
