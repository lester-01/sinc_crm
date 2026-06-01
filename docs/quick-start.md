[← Back to README — Quick start](../README.md#quick-start)

# Quick Start

Canonical **P1 local development** guide. Cloudflare deploy is [deploy-guide.md](./deploy-guide.md) (P3).

Full script map: [script-reference.md](./script-reference.md).

---

## Automated path (recommended)

Linux or WSL, from a fresh clone:

```bash
cd /path/to/your-clone

# 1. Machine bootstrap (Linux, Node 22, wrangler + supabase CLI)
npm run setup:local

# 2. Supabase credentials — copy template, then paste keys
cp .env.example .env
# paste Supabase URL, publishable key, secret key, DB URL (see below)

npm run setup:supabase

# 3. Database (empty Supabase project only — first time)
npm run db:schema
npm run db:seed

# 4. Run dev servers (two terminals)
npm run dev                              # frontend :5173
cd worker && npm run dev                 # API :8787
```

Open [http://localhost:5173](http://localhost:5173) and sign in with a [demo user](../README.md#demo-users) (`demo1234`).

**Optional:** `npm run verify:all` — maintainer checklist (includes Cloudflare + GitHub stubs).

### What `setup:local` does

Orchestrator (one command):

1. `verify:linux` — Linux/WSL, git, curl
2. `setup:node` — nvm + Node 22 (may update shell config)
3. `setup:cli` — npm install root + worker (wrangler, supabase CLI)
4. `verify:local` — confirms machine readiness

Re-running is safe. Skip final verify: `SKIP_VERIFY=1 npm run setup:local`.

### After setup:node — restart your terminal

If nvm or shell config changed, `source ~/.bashrc` (or open a new terminal), then:

```bash
node -v    # v22.x.x
npm run verify:local
```

### Troubleshooting: `npm_config_prefix`

```bash
unset npm_config_prefix
npm run setup:node
```

---

## Environment file (P1 — Supabase only)

Installers **do not** copy `.env`. Never commit it.

### Single `.env` at repo root

All credentials live in one file. The Vite frontend reads publishable Supabase values via `vite.config.ts` (`SUPABASE_*` → `import.meta.env.VITE_SUPABASE_*` at build/dev time). Wrangler dev loads the same file: `wrangler dev --env-file ../.env`.

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings → API**:

| Dashboard field | Variable in `.env` |
|-----------------|-------------------|
| Project URL | `SUPABASE_URL` |
| **Publishable** key | `SUPABASE_PUBLISHABLE_KEY` |
| **Secret** key | `SUPABASE_SECRET_KEY` |

Also set:

```env
VITE_API_BASE_URL=http://localhost:8787
```

Use `SUPABASE_*` for Supabase values — see [.env.example](../.env.example) for the full template.

Database URI and optional E2E keys: see [.env.example](../.env.example) comments and [database-setup.md](./database-setup.md).

While pasting keys: `SKIP_VERIFY=1 npm run setup:supabase`

Schema, seed, reset: [database-setup.md](./database-setup.md).

### Cloudflare (P3 — not required for local dev)

Add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` to `.env` when deploying. See [deploy-guide.md](./deploy-guide.md).

### E2E-only keys (optional)

For isolated Playwright (`npm run test:e2e`), add to `.env`:

- `SUPABASE_ACCESS_TOKEN` — [account token](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_ORG_SLUG` — org slug from dashboard URL

Playwright on WSL: [playwright-wsl-setup.md](./playwright-wsl-setup.md).

---

## Manual fallback

### Windows (no WSL)

Use **WSL** when possible. Otherwise install **Node.js 22+**, then:

```bash
npm run setup:node
npm run setup:cli
npm run verify:local
# copy + fill .env
npm run setup:supabase
npm run db:schema && npm run db:seed
```

### Atomic debug path

```bash
npm run verify:linux
npm run setup:node && npm run verify:node
npm run setup:cli && npm run verify:cli
```

Script reference: [script-reference.md](./script-reference.md).

Production deploy: [deploy-guide.md](./deploy-guide.md).
