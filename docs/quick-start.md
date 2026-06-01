[← Back to README — Quick start](../README.md#quick-start)

# Quick Start

Canonical setup guide for the SINC Student CRM. Use the **automated path** on Linux/WSL; fall back to manual steps when needed.

---

## Automated path (recommended)

Linux or WSL, from a fresh clone:

```bash
cd /path/to/your-clone

# 1. Local tools + deps (nvm, Node 22, wrangler, supabase CLI, project deps)
npm run install:linux

# 2. Environment files — copy examples, then paste keys from dashboards
cp .env.example .env
cp worker/.dev.vars.example worker/.dev.vars
cp worker/.cloudflare.env.example worker/.cloudflare.env
# See "Environment files" below for what goes where

# 3. Cloud credentials (after keys are pasted)
npm run setup:cloud
npm run verify:stack:cloud

# 4. Database (empty Supabase project only — first time)
npm run db:schema
npm run db:seed

# 5. Run dev servers (two terminals)
npm run dev                              # frontend :5173
cd worker && npm run dev                 # API :8787
```

Open [http://localhost:5173](http://localhost:5173) and sign in with a [demo user](../README.md#demo-users) (`demo1234`).

**Optional sanity check:** `npm run verify:stack:full`

### What `install:linux` does

1. Confirms Linux or WSL
2. Installs **nvm** if missing (updates `~/.bashrc` or `~/.zshrc`)
3. Installs and activates **Node 22** (from `.nvmrc`)
4. Installs **wrangler** in `worker/` and **supabase** CLI at repo root
5. Runs `npm run verify:stack:local`

Re-running is safe: skips steps already complete. Skip verification: `SKIP_VERIFY=1 npm run install:linux`.

### After install: restart your terminal

Already-open terminals do not load nvm changes until you `source ~/.bashrc` (or `~/.zshrc`) or open a new terminal. Then confirm:

```bash
node -v    # v22.x.x
npm run verify:stack:local
```

### Troubleshooting: `npm_config_prefix`

If install fails with `nvm is not compatible with the "npm_config_prefix" environment variable`:

```bash
unset npm_config_prefix
npm run install:linux
```

Requirements: `curl`, `git`, `bash`, and internet access.

---

## Environment files

Installers **do not** copy env files — you create them and paste keys. Never commit the copies.

**Do not run `npm run setup:cloud` until required keys are set** (files and/or environment — see [external-auth.md](./external-auth.md)).

### Supabase keys

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings → API**:

| Dashboard field | File | Variable |
|-----------------|------|----------|
| Project URL | `.env` | `VITE_SUPABASE_URL` |
| Project URL | `worker/.dev.vars` | `SUPABASE_URL` |
| **Publishable** key (public) | `.env` | `VITE_SUPABASE_PUBLISHABLE_KEY` |
| **Secret** key | `worker/.dev.vars` only | `SUPABASE_SECRET_KEY` |

Also in `.env`:

```env
VITE_API_BASE_URL=http://localhost:8787
```

**Never** put the secret key in `.env` (Vite must not see it).

Schema, seed, and reset without deleting the project: [database-setup.md](./database-setup.md).

### Cloudflare scoped API token

Use a **scoped API token** in `worker/.cloudflare.env` or environment (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`). See [cloudflare-auth.md](./cloudflare-auth.md) for permissions and [external-auth.md](./external-auth.md) for the auth ladder.

Paste into `worker/.cloudflare.env`:

```env
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

While keys are still empty:

```bash
SKIP_CLOUD_VERIFY=1 npm run setup:cloud   # Cloudflare auth only
```

### E2E-only keys (optional)

For isolated Playwright (`npm run test:e2e`), add to `worker/.dev.vars`:

- `SUPABASE_ACCESS_TOKEN` — [account token](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_ORG_SLUG` — org slug from dashboard URL

Playwright on WSL: [playwright-wsl-setup.md](./playwright-wsl-setup.md).

---

## npm scripts reference

| Script | Purpose |
|--------|---------|
| `npm run install:linux` | Full local bootstrap (nvm, Node 22, CLIs, deps, verify) |
| `npm run install:project` | Worker + frontend deps only (no nvm) |
| `npm run setup:local` | Same as install:project — use when Node 22+ already active |
| `npm run setup:worker` | Worker npm deps + wrangler |
| `npm run setup:frontend` | Root npm deps (Vite/React) |
| `npm run setup:cloud` | Cloudflare auth + stack cloud checks |
| `npm run db:schema` | Apply SQL schema (empty Supabase project) |
| `npm run db:seed` | Seed demo users and sample data |
| `npm run verify:stack:local` | Node, wrangler, supabase CLI |
| `npm run verify:stack:cloud` | Env files + Cloudflare + GitHub remote |
| `npm run verify:stack:supabase` | Tables exist + secret key works |
| `npm run verify:stack:full` | All verify phases |
| `npm run verify:stack:env` | Env file presence and keys |
| `npm run verify:stack:cloudflare` | Cloudflare token / whoami |
| `npm run verify:stack:github` | GitHub remote configured |
| `npm run verify:stack:scaffold` | Worker + frontend scaffold checks |
| `SKIP_VERIFY=1 npm run install:linux` | Install without verify |
| `SKIP_CLOUD_VERIFY=1 npm run setup:cloud` | Cloudflare auth only (keys incomplete) |

Production deploy: [deploy-guide.md](./deploy-guide.md) (`npm run deploy:all`).

---

## Manual fallback

### Windows (no WSL)

Use **WSL** and the automated path above when possible. Otherwise:

1. Install **Node.js 22+** from [nodejs.org](https://nodejs.org/)
2. Clone and `cd` into the project
3. `npm run setup:local`
4. `npm run verify:stack:local`
5. Copy env files and paste keys (see [Environment files](#environment-files))
6. `npm run setup:cloud` → `npm run db:schema` → `npm run db:seed`
7. Run dev servers (see automated path step 5)

### Step-by-step without `install:linux`

When nvm/install.sh is not an option but Node 22+ is available:

```bash
npm run setup:local          # or: setup:worker + setup:frontend
npm run verify:stack:local

# Copy and fill env files (see Environment files)
npm run setup:cloud
npm run verify:stack:cloud

npm run db:schema
npm run db:seed
```

If `db:schema` fails, apply SQL manually via Supabase SQL Editor — see [database-setup.md](./database-setup.md).

Install wrangler and supabase CLI yourself if missing:

```bash
cd worker && npm install
cd .. && npm install
npx supabase --version
cd worker && npx wrangler --version
```

Further verification commands: [stack-setup.md](./stack-setup.md).
