# E2E run artifacts & reporting

Every **isolated** E2E run (local agent, local manual, GitHub Actions) produces a dated session folder with **per-test subfolders** for review.

Related: [testing-plan.md](./testing-plan.md), [ci-e2e-recipe.md](./ci-e2e-recipe.md)

---

## Isolated run pipeline (local + CI — same steps)

```txt
1. Create Supabase project   name: sinc-ci-e2e-<timestamp-or-run-id>
2. Write ephemeral env       .e2e-run.env (gitignored) — URL, keys, pooler URL
3. db:schema + db:seed
4. Start Vite + Worker       Playwright webServer or orchestrator
5. Run Playwright tests      UI mode locally (agent); headless in GitHub Actions
6. Generate reports          console + per-test folders + HTML summary
7. Cleanup                   delete Supabase project (always(), even on failure)
```

**Dev project** (`.env` / `worker/.dev.vars`) is **not** used for default E2E runs — only for day-to-day app coding.

Optional fast path: `npm run test:e2e:dev` — tests against existing dev Supabase (no create/delete). For quick iteration only; not the regression default.

---

## Commands (planned Phase 6)

| Script | Purpose |
|--------|---------|
| `npm run test:e2e` | Isolated run, headless, full pipeline + artifacts |
| `npm run test:e2e:ui` | **Same pipeline**, Playwright **UI mode** (agent + human review) |
| `npm run test:e2e:dev` | Optional: skip DB create/delete; use current `.env` |
| `npm run test:e2e -- --grep @phase6` | Isolated run, subset of tests |

Orchestrator: `scripts/e2e-run.mjs` (create → seed → playwright → report → delete).

---

## Session folder layout

Root: **`test-results/`** (gitignored)

```txt
test-results/
  2026-05-27_14-30-22/                 # session = UTC/local ISO date + time
    run.json                           # overall: pass/fail, counts, duration, project name
    run.log                            # full stdout: lifecycle + per-test lines
    summary.html                       # links to each test folder + Playwright HTML report
    playwright-report/                 # Playwright HTML report (whole run)
    tests/
      AUTH-01-manager-login/
        meta.json                      # id, title, status, duration, error message
        test.log                       # steps/assertions logged for this test
        screenshots/
          01-login-page.png
          02-dashboard.png
        trace.zip                      # Playwright trace (retained for review)
        video.webm                     # if video enabled
      AUTH-02-sales-login/
        ...
```

### Naming rules

| Item | Pattern | Example |
|------|---------|---------|
| Session folder | `YYYY-MM-DD_HH-mm-ss` | `2026-05-27_14-30-22` |
| Test folder | `<TEST-ID>-<short-slug>` | `AUTH-01-manager-login` |
| Screenshots | ordered prefix + step slug | `01-login-page.png` |

Test IDs match [testing-plan.md](./testing-plan.md) (`AUTH-01`, `CHAT-07`, …). Spec `test.describe` / `test` titles align with IDs for grep and folders.

---

## Logging (what appears in `run.log` / `test.log`)

Each test should log human-readable lines, for example:

```txt
[AUTH-01] START — Manager login
[AUTH-01] STEP  — Open /login
[AUTH-01] STEP  — Fill manager1@demo.local
[AUTH-01] ASSERT — Redirected to /dashboard
[AUTH-01] PASS  — duration 2.4s
```

Failures:

```txt
[CHAT-08] FAIL  — Expected 403, got 200 — client1 accessed client2 thread
```

Implemented via small `e2e/helpers/log.ts` + Playwright fixture; list reporter remains enabled for terminal output.

---

## Playwright settings (planned)

| Setting | Value | Reason |
|---------|--------|--------|
| `screenshot` | `on` (or `only-on-failure` + explicit step screenshots) | Review evidence |
| `trace` | `on` or `retain-on-failure` | Debug in UI mode |
| `video` | optional `retain-on-failure` | Heavier; enable if useful |
| `reporter` | `list`, `html`, custom artifact hook | Console + summary + per-test dirs |
| UI mode | `playwright test --ui` | Agent default for visibility |

**GitHub Actions:** same orchestrator, **no** `--ui`; upload `test-results/<session>/` as workflow artifact.

---

## Credentials for isolated runs

**E2E only** — skip these for normal app development.

| Variable | Required for | Purpose |
|----------|----------------|---------|
| `SUPABASE_ACCESS_TOKEN` | `test:e2e` / `test:e2e:ui` only | Create/delete `sinc-ci-e2e-*` |
| `SUPABASE_ORG_SLUG` | same | Org slug for new projects (dashboard URL) |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, … | dev + E2E | Dev project keys in `.env` / `worker/.dev.vars` |

Generated per isolated run (`.e2e-run.env`, gitignored):

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`

---

## Reviewing results

1. Open `test-results/<latest-session>/summary.html`
2. Or open Playwright UI during run: `npm run test:e2e:ui`
3. Per failure: open `tests/<TEST-ID>/screenshots/` and `trace.zip` (Playwright trace viewer)

Do not commit `test-results/` — add to `.gitignore` in Phase 6.
