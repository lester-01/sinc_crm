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

**Tested on:** Debian **trixie** (13) under WSL2. Other distros use the same scripts; package names may differ — see troubleshooting.

```bash
cd /path/to/sinc-dev-developer-test-of-competence
npm install
npm run playwright:setup          # downloads Chromium (no sudo)
sudo npm run playwright:install-deps   # Linux system libs — OS-detected (needs password)
npm run verify:playwright
```

### What `sudo npm run playwright:install-deps:debian` did (Trixie)

That command ran `scripts/install-playwright-deps-debian.sh`, which:

1. Ran `apt-get update`
2. Installed a **fixed list of Debian 12 / Chromium-only** libraries (fonts, GTK stack, NSS, X11, etc.)
3. Let apt map legacy names to **t64** packages on Trixie (`libasound2` → `libasound2t64`, …)

It did **not** use Playwright’s broken Ubuntu 20.04 fallback (which happens when you run bare `sudo npx playwright install-deps` on Trixie).

The portable entry point is now **`sudo npm run playwright:install-deps`** (wrapper detects OS; Trixie still uses the same apt list).

### OS detection (`playwright:install-deps`)

| OS | Behavior |
|----|----------|
| Debian 13 (trixie) | Repo apt list (`install-playwright-deps-debian.sh`) |
| Debian 12 / 11 | `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE` + `npx playwright install-deps chromium` |
| Ubuntu | Playwright native `install-deps chromium` |
| Other Linux | Playwright default; may fail on bleeding-edge releases |

**Requires sudo** — npm scripts cannot enter your password. Cursor agents often cannot run `sudo`; run these in your own terminal.

**Do not** run `install-deps` without **`chromium`** — that pulls WebKit/Firefox packages and fails on Trixie.

Optional: if `apt update` fails on **trixie-backports** (`Couldn't find the start of the patch series`), comment out that source in `/etc/apt/sources.list.d/` or fix backports after `sudo apt update && sudo apt upgrade`.

**`install-deps: command not found`** means you ran the wrong command. There is no system binary called `install-deps`. It is a **Playwright subcommand**:

| Wrong | Right |
|-------|--------|
| `install-deps` | `sudo npx playwright install-deps chromium` (must include **chromium**) |
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

# Isolated + UI (slow first: creates Supabase project)
npm run test:e2e:ui

# UI + existing dev Supabase (recommended for daily work)
npm run test:e2e:ui:dev -- --grep @phase6

# One phase only (headless isolated)
npm run test:e2e -- --grep @phase6

# Fast path: use existing dev Supabase (no create/delete)
npm run test:e2e:dev
```

Artifacts: `test-results/YYYY-MM-DD_HH-mm-ss/` — see [e2e-artifacts.md](./e2e-artifacts.md).

---

## Headless vs UI mode vs “watching” the app

| Mode | What you see |
|------|----------------|
| **`npm run test:e2e`** (default) | Headless Chromium runs tests; no window |
| **`npm run test:e2e:ui`** | Playwright **test runner** in a browser tab — pick tests, click **Run**; not a live view of clicks/typing |
| **`npx playwright test --headed`** | Real browser window during automation (optional debugging) |

We use **headless** for phase work. UI mode is optional and does **not** replace headed runs if you want to watch pages being automated.

## WSL: UI mode vs headless

| Mode | WSL requirement |
|------|-----------------|
| **Headless** (`test:e2e`) | Works on any WSL2 |
| **UI mode** (`test:e2e:ui:dev`) | Needs WSLg / DISPLAY; opens a **browser tab** (test dashboard only) |

**UI mode on Windows 11 + WSL2:**

- **WSLg** (default on recent Win11): UI should open at `http://127.0.0.1:<port>` in a browser tab.
- The repo passes **`--ui-host 127.0.0.1`** on Linux to avoid a blank/hung **bundled Chromium** window (common on WSLg).
- **UI does not auto-run tests** — you must click **Run** in the Playwright UI. A static window is normal until you run something.
- Prefer **`test:e2e:ui:dev`** (no Supabase create/delete) so the UI starts quickly.
- Start dev servers first for snappier UI: `npm run dev` (root) and `npm run dev` (worker), or let Playwright start them (slower).

**If UI still hangs or stays blank:**

```bash
unset PLAYWRIGHT_BROWSERS_PATH
npm run playwright:install
# Manual UI with explicit host (same as orchestrator):
E2E_UI_MODE=1 npx playwright test --ui --ui-host 127.0.0.1 --grep @phase6
# Open the URL printed in the terminal if the browser does not open
```

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
| `Host system is missing dependencies` | `sudo npm run playwright:install-deps` |
| `install-deps: command not found` | Use `npx playwright install-deps chromium` — see table above |
| UI window blank / frozen | Use `test:e2e:ui:dev`; ensure `--ui-host 127.0.0.1`; click **Run** in UI |
| UI opens then “nothing happens” | Tests do not auto-start in UI mode — click Run |
| `Executable doesn't exist` / wrong chromium build | `unset PLAYWRIGHT_BROWSERS_PATH` then `npm run playwright:install` |
| Browser won’t open in UI mode | Use `test:e2e` headless, or enable WSLg / update Windows |
| Tests can’t reach app | Ensure orchestrator starts Vite `:5173` + Worker `:8787` (Phase 6 config) |
| E2E fails at “create project” | Add `SUPABASE_ACCESS_TOKEN` + `SUPABASE_ORG_SLUG` to `worker/.dev.vars` |
| Slow first run | Creating a new Supabase project each isolated run takes a few minutes — expected |

---

## Summary

1. Use **project npm Playwright**, not a Cursor plugin.  
2. Run **`npm run playwright:setup`** then **`sudo npm run playwright:install-deps`** once in WSL.  
3. Add **access token + org slug** (`SUPABASE_ORG_SLUG`) only when you run **isolated E2E**.  
4. Prefer **`test:e2e:ui:dev`** when you want to watch tests; use headless + `test-results/` if UI display fails.
