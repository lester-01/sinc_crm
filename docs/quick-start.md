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

# 2. Supabase credentials — copy examples, then paste keys
cp .env.example .env
cp worker/.dev.vars.example worker/.dev.vars
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

## Environment files (P1 — Supabase only)

Installers **do not** copy env files. Never commit the copies.

### Supabase keys

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings → API**:

| Dashboard field | File | Variable |
|-----------------|------|----------|
| Project URL | `.env` | `VITE_SUPABASE_URL` |
| Project URL | `worker/.dev.vars` | `SUPABASE_URL` |
| **Publishable** key | `.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Secret** key | `worker/.dev.vars` only | `SUPABASE_SECRET_KEY` |

Also in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8787
```

**Never** put the secret key in `.env`.

While pasting keys: `SKIP_VERIFY=1 npm run setup:supabase`

Schema, seed, reset: [database-setup.md](./database-setup.md).

### Cloudflare (P3 — not required for local dev)

See [deploy-guide.md](./deploy-guide.md). Do **not** need `worker/.cloudflare.env` to run locally.

### E2E-only keys (optional)

For isolated Playwright (`npm run test:e2e`), add to `worker/.dev.vars`:

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
# copy + fill .env and worker/.dev.vars
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
