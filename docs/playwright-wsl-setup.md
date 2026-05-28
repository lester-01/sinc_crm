# Playwright on WSL — setup guide

How to run **local** E2E tests on **WSL2** as we build (Phase 6+). **GitHub Actions** is a later CI stage — not required now.

You do **not** need a Cursor Playwright extension.

Related: [testing-plan.md](./testing-plan.md), [e2e-artifacts.md](./e2e-artifacts.md)

---

## Two installs? (common confusion)

| Install | What it is |
|---------|------------|
| **Your earlier install** | e.g. `npx playwright install` outside the repo → browsers under `~/.cache/ms-playwright` (may be a **different Playwright version**) |
| **This repo** | `@playwright/test` in `package.json` → must run **`npm run playwright:install`** here so browser build **matches** the project |

You can have both (`chromium-1148` and `chromium-1223` in `~/.cache/ms-playwright`). Tests use the version pinned in **this** `package.json`.

**Cursor/agent:** If `PLAYWRIGHT_BROWSERS_PATH` is set in the environment, unset it in your terminal before running tests:

```bash
unset PLAYWRIGHT_BROWSERS_PATH
```

Verify setup:

```bash
npm run verify:playwright
```

---

## Recommended install (project-local npm — not a Cursor plugin)

**Phase 6** adds Playwright as a **devDependency** in this repo. Until then, use the global/cli install above. After Phase 6:

```bash
cd /path/to/sinc-dev-developer-test-of-competence
npm install
npx playwright install chromium
```

On WSL/Linux, if the browser fails to start with “missing dependencies”:

```bash
# From repo root — needs sudo (installs apt packages)
sudo npx playwright install-deps chromium
```

Or:

```bash
npm run playwright:install-deps
```

**`install-deps: command not found`** means you ran the wrong command. There is no system binary called `install-deps`. It is a **Playwright subcommand**:

| Wrong | Right |
|-------|--------|
| `install-deps` | `sudo npx playwright install-deps chromium` |
| `playwright install-deps` (not on PATH) | `npm run playwright:install-deps` |
| `npx install-deps` | `npx playwright install-deps chromium` |

| Approach | Use it? |
|----------|---------|
| **`npm install` + `npx playwright install`** in the repo | **Yes — default** |
| Cursor “Playwright” extension / plugin | **No** — optional elsewhere; not required for this assessment |
| Global `npm install -g playwright` | **No** — stick to project version |

Run tests from the **WSL terminal** in the project folder (same environment as `npm run dev`).

---

## What you need before first E2E run

### Always (app development)

| Item | File |
|------|------|
| Supabase URL + publishable key | `.env` |
| Supabase URL + secret key (+ pooler URL for schema) | `worker/.dev.vars` |

Enough for `npm run dev`, `db:schema`, `db:seed`, and optional `npm run test:e2e:dev`.

### Only for isolated E2E (`npm run test:e2e` / `test:e2e:ui`)

These create/delete temporary `sinc-ci-e2e-*` Supabase projects. **Not required** for normal coding.

| Item | File | Get from |
|------|------|----------|
| `SUPABASE_ACCESS_TOKEN` | `worker/.dev.vars` | [Account tokens](https://supabase.com/dashboard/account/tokens) |
| `SUPABASE_ORG_SLUG` | `worker/.dev.vars` | Dashboard URL: `…/org/<slug>/…` (not a UUID) |

Without them, isolated E2E cannot run; **dev and Worker still work.**

---

## Commands (after Phase 6 lands)

```bash
# Isolated DB + tests + artifacts + cleanup (headless)
npm run test:e2e

# Same pipeline, Playwright UI (watch tests) — agent default
npm run test:e2e:ui

# One phase only
npm run test:e2e -- --grep @phase6

# Fast path: use existing dev Supabase (no create/delete)
npm run test:e2e:dev
```

Artifacts: `test-results/YYYY-MM-DD_HH-mm-ss/` — see [e2e-artifacts.md](./e2e-artifacts.md).

---

## WSL: UI mode vs headless

| Mode | WSL requirement |
|------|-----------------|
| **Headless** (`test:e2e`) | Works on any WSL2 |
| **UI mode** (`test:e2e:ui`) | Needs a display |

**UI mode on Windows 11 + WSL2:**

- **WSLg** (default on recent Win11): Playwright UI opens automatically — preferred.
- If UI fails with display errors: use headless `npm run test:e2e` and open `test-results/.../summary.html` + traces.

**WSL without GUI:** use headless only; review `test-results/` folders and Playwright HTML report.

---

## Verify Playwright is ready (Phase 6+)

```bash
npx playwright --version
npx playwright install chromium --dry-run   # or run install once
```

Optional GitHub Actions readiness (unrelated to Playwright install):

```bash
npm run verify:github-actions
```

---

## Troubleshooting (WSL)

| Problem | Try |
|---------|-----|
| `Host system is missing dependencies` | `sudo npx playwright install-deps chromium` |
| `install-deps: command not found` | Use `npx playwright install-deps` — see table above |
| `Executable doesn't exist` / wrong chromium build | `unset PLAYWRIGHT_BROWSERS_PATH` then `npm run playwright:install` |
| Browser won’t open in UI mode | Use `test:e2e` headless, or enable WSLg / update Windows |
| Tests can’t reach app | Ensure orchestrator starts Vite `:5173` + Worker `:8787` (Phase 6 config) |
| E2E fails at “create project” | Add `SUPABASE_ACCESS_TOKEN` + `SUPABASE_ORG_SLUG` to `worker/.dev.vars` |
| Slow first run | Creating a new Supabase project each isolated run takes a few minutes — expected |

---

## Summary

1. Use **project npm Playwright**, not a Cursor plugin.  
2. Run **`npx playwright install chromium`** once in WSL.  
3. Add **access token + org slug** (`SUPABASE_ORG_SLUG`) only when you run **isolated E2E**.  
4. Prefer **`test:e2e:ui`** when you want to watch tests; use headless + `test-results/` if UI display fails.
