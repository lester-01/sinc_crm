[← Back to README — Documentation](../README.md#documentation)

# External service authentication (tooling)

Scripts, setup, and verification use a shared **auth ladder** for Cloudflare, Supabase, and GitHub. This is separate from **app login** (Supabase Auth in the browser).

## Ladder (all services)

1. **Already authenticated** — e.g. `wrangler whoami` succeeds, Supabase API reachable, `gh auth status` OK.
2. **`process.env`** — injected keys/tokens (CI, shell export). **Overrides** dotenv file values when both are set.
3. **Dotenv files** — root `.env`, optional `E2E_ENV_FILE` overlay (isolated E2E). Files are **not required** when every required key for that step is already in the environment.
4. **Interactive OAuth** — `wrangler login`, `gh auth login` (desktop). Tool default timeouts; no custom repo timeout.

## Headless / CI (`CI=true`)

When `CI=true` (GitHub Actions, GitLab CI, etc.), scripts treat the environment as **headless**:

- **Do not** start browser OAuth.
- **Fail fast** with instructions to set env vars instead.

There is no `SINC_*` flag — use the standard `CI` variable only.

| Service | Required in CI |
|---------|----------------|
| Cloudflare | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` |
| Supabase (app + worker) | `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `VITE_API_BASE_URL` |
| Supabase (E2E project create/delete) | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_SLUG` |
| GitHub (optional verify) | `GITHUB_TOKEN` or `GH_TOKEN` |

## Injectable environment variables

| Variable | Used by |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Wrangler, `ensure-cloudflare-auth.sh`, verify cloudflare |
| `CLOUDFLARE_ACCOUNT_ID` | Wrangler (recommended with token) |
| `SUPABASE_URL` | Vite (via define), Worker, db scripts, verify |
| `SUPABASE_PUBLISHABLE_KEY` | Vite (via define), verify |
| `SUPABASE_SECRET_KEY` | Worker, db scripts |
| `VITE_API_BASE_URL` | Vite (local worker URL) |
| `SUPABASE_ACCESS_TOKEN` | E2E isolated project scripts, deploy Auth URL sync |
| `SUPABASE_ORG_SLUG` | E2E isolated project scripts |
| `GITHUB_TOKEN` / `GH_TOKEN` | `verify-github-actions` |
| `E2E_ENV_FILE` | Path to extra dotenv overlay for E2E |
| `STACK_ENV_FILE` | Test-only override for `.env` path |
| `CI` | When `true`, skip OAuth and fail fast |

**Deprecated (do not use in new `.env` files):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — use `SUPABASE_*` instead. See [.env.example](../.env.example).

Implementation: `scripts/lib/load-stack-env.mjs` merges `.env` + overlay, then applies `STACK_ENV_KEYS` from `process.env`.

## Isolated E2E environment split

| File | Contents |
|------|----------|
| Root `.env` | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_ORG_SLUG` (orchestration — create/delete ephemeral projects) |
| `.e2e-run.env` | Ephemeral project keys written by `scripts/e2e-create-project.mjs`; passed as `E2E_ENV_FILE` to Vite, Worker, db scripts, and Playwright |

During `npm run test:e2e`, runtime credentials come from `.e2e-run.env`, not your dev project in `.env`. Playwright API tests use `e2e/fixtures/api-auth.ts`, which merges both files (overlay wins).

For `npm run test:e2e:dev`, only root `.env` is used (no overlay).

## Per service

### Cloudflare

- Script: `scripts/ensure-cloudflare-auth.sh`
- Order: existing session → env token → root `.env` → `wrangler login` (desktop only; **blocked when `CI=true`**)
- Details: [cloudflare-auth.md](./cloudflare-auth.md)

### Supabase (tooling)

- Scripts: `db:schema`, `db:seed`, E2E create/delete, `verify-setup` supabase phases
- Keys from merged stack env (`.env` + env). See [database-setup.md](./database-setup.md).

### GitHub (optional)

- Script: `npm run verify:github-actions`
- Order: git remote / clone access → `GITHUB_TOKEN`/`GH_TOKEN` → `gh` OAuth (skipped when `CI=true` without token)

## Automated tests (`AUTH-LADDER-*`)

| Command | Coverage |
|---------|----------|
| `npm run test:scripts` | Env override, `CI=true` fail-fast, require-credentials, verify-github CI path |

See [testing-guide.md](./testing-guide.md#tooling-auth-ladder-auth-ladder--node-test) for the full ID list.

## Quick commands

```bash
npm run test:scripts

# Token only via env (no .env file on disk)
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run verify:cloudflare

# CI simulation — OAuth must not run
CI=true bash scripts/ensure-cloudflare-auth.sh   # exits 1 without token

npm run setup:cloudflare
```
