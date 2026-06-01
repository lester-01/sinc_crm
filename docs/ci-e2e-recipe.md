# CI E2E recipe (GitHub Actions) — deferred

**Status:** Recipe only — implement **after** local Playwright suite is green (see [stack-setup.md](./stack-setup.md) todo **Phase 15** or post–Phase 14 item).

Local and CI share **`scripts/e2e-run.mjs`**: create DB → seed → test → report → delete. See [testing-plan.md](./testing-plan.md) and [e2e-artifacts.md](./e2e-artifacts.md).

---

## Goals

1. On each PR/push: same isolated pipeline as local (`npm run test:e2e` via orchestrator).
2. Upload `test-results/<session>/` as GitHub Actions artifact for reviewers.
3. CI projects: prefix **`sinc-ci-e2e-`** — do not use for manual dev.
4. Headless only in CI (no `--ui`). No Cursor browser MCP.

---

## Supabase project naming

| Field | Value |
|-------|--------|
| **Prefix** | `sinc-ci-e2e-` |
| **Full name example** | `sinc-ci-e2e-pr-42-20260527` or `sinc-ci-e2e-run-1234567890` |

Include run ID or timestamp so concurrent runs do not collide. **Leave these projects alone** if teardown fails — safe to delete manually when name starts with `sinc-ci-e2e-`.

---

## High-level workflow

```yaml
# .github/workflows/e2e.yml (to be added later)
name: E2E

on:
  pull_request:
  push:
    branches: [main, development]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "22"
      - run: npm ci
      - run: npx playwright install --with-deps chromium

      # 1) Create Supabase project (Management API or documented script)
      #    name: sinc-ci-e2e-${{ github.run_id }}

      # 2) Write orchestration secrets to .env (SUPABASE_ACCESS_TOKEN, SUPABASE_ORG_SLUG)
      #    Runtime keys go to .e2e-run.env via e2e-create-project.mjs (SUPABASE_URL, keys, pooler URL)

      # 3) Bootstrap database
      - run: npm run db:schema
      - run: npm run db:seed
        env:
          SEED_DEMO_PASSWORD: demo1234

      # 4) Isolated E2E (create → seed → test → report → delete)
      - run: npm run test:e2e

      # 5) Upload artifacts for reviewers
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: e2e-test-results
          path: test-results/

      # Teardown is inside e2e-run.mjs (always delete sinc-ci-e2e-* project)
```

Exact create/delete steps depend on Supabase Management API token availability in GitHub secrets (`SUPABASE_ACCESS_TOKEN` or org token). Document token setup in [project-guide.md](./project-guide.md) when CI is implemented.

---

## Check readiness (optional, before enabling CI)

```bash
npm run verify:github-actions
```

**Not required** for local dev. Auth order in the script:

1. **Git access** — `git fetch origin --dry-run` (your existing git credentials)
2. **Env token** — `GITHUB_TOKEN` or `GH_TOKEN` (PAT with `repo` scope; add `workflow` to edit workflows)
3. **gh OAuth fallback** — `gh auth login` on desktop if no PAT

Enabling **Actions** on the repo is a **Settings → Actions** toggle; a PAT alone does not turn Actions on. **CI workflows** use GitHub’s built-in `GITHUB_TOKEN`, not your PAT.

## Required GitHub secrets (when CI enabled)

| Secret | Purpose |
|--------|---------|
| `SUPABASE_ACCESS_TOKEN` | **E2E/CI only** — create/delete `sinc-ci-e2e-*` projects |
| `SUPABASE_ORG_SLUG` | **E2E/CI only** — org slug for project creation |
| Optional | `SEED_DEMO_PASSWORD` (default `demo1234`) |

Per-run keys (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `SUPABASE_DB_URL`, `VITE_API_BASE_URL`) come from the **created** project API response — written to `.e2e-run.env`, not stored long-term.

**Note:** `SUPABASE_ACCESS_TOKEN` / `SUPABASE_ORG_SLUG` in root `.env` (or CI secrets) are for **isolated E2E orchestration only**, not for `npm run dev`.

---

## Local vs CI

| | Local (agent / you) | CI (later) |
|---|----------------------|------------|
| Supabase | Ephemeral `sinc-ci-e2e-*` each run | Same |
| Orchestrator | `scripts/e2e-run.mjs` | Same script |
| Playwright mode | **`npm run test:e2e:ui`** (UI visible) | `test:e2e` headless |
| Artifacts | `test-results/YYYY-MM-DD_HH-mm-ss/` | Uploaded as workflow artifact |
| Dev project | Only for `npm run dev` / optional `test:e2e:dev` | Not used |

---

## Implementation checklist

**Phase 6 (local isolated runs):**

- [ ] `scripts/e2e-create-project.mjs` / `e2e-delete-project.mjs` (prefix `sinc-ci-e2e-`)
- [ ] `scripts/e2e-run.mjs` — full pipeline + artifact paths
- [ ] `e2e/reporters/artifact-reporter.ts` + `helpers/log.ts`
- [ ] `.gitignore`: `test-results/`, `.e2e-run.env`

**When CI enabled:**

- [ ] `.github/workflows/e2e.yml` calling `npm run test:e2e`
- [ ] `actions/upload-artifact` for `test-results/`
- [ ] Document secrets in [project-guide.md](./project-guide.md)
