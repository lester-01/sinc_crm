# Quick Start

## Linux / WSL (automated)

After cloning the repository:

```bash
cd /path/to/your-clone
npm run install:linux
```

Or:

```bash
bash scripts/install.sh
```

This script will:

1. Confirm you are on Linux or WSL
2. Install **nvm** if missing (bash/zsh config updated automatically)
3. Install and activate **Node 22** (from `.nvmrc`)
4. Install **wrangler** in `worker/` and **supabase** CLI at repo root
5. Run `npm run verify:stack:local`

Skip verification only:

```bash
SKIP_VERIFY=1 npm run install:linux
```

Re-running `npm run install:linux` is safe: it skips when Node 22+, wrangler, and supabase are already installed (still runs verify unless `SKIP_VERIFY=1`).

### After install: restart your terminal

The installer may install **nvm** and update `~/.bashrc` (or `~/.zshrc`). **Already-open terminals do not load those changes** until you:

- **Option A (quick):** `source ~/.bashrc` (or `source ~/.zshrc`)
- **Option B (recommended):** Close the terminal, open a **new** one, then `cd` back to the project

Then confirm:

```bash
node -v    # must show v22.x.x
npm run verify:stack:local
```

### Troubleshooting: `npm_config_prefix`

If install fails immediately with:

```text
nvm is not compatible with the "npm_config_prefix" environment variable
```

Your shell still has a system npm prefix (common on WSL). Fix for **this** session:

```bash
unset npm_config_prefix
npm run install:linux
```

After a successful install, **restart the terminal** (or `source ~/.bashrc`) so nvm and Node 22 load automatically. The installer adds an `unset` for this variable to your shell config when it configures nvm.

### Requirements

- `curl`, `git`, and `bash`
- Internet access for nvm and npm

---

## Windows (manual — no WSL)

This repository does not ship a Windows installer. Use **WSL** (recommended) and follow the Linux section above, or install tools manually:

### 1. Node.js 22+

Download and install from [https://nodejs.org/](https://nodejs.org/) (22.x LTS).

Verify in PowerShell or CMD:

```cmd
node -v
npm -v
```

Must show `v22.x.x` or higher (Wrangler 4.95 requires Node 22+).

### 2. Clone and open the project

```cmd
cd C:\path\to\your-clone
```

### 3. Install project dependencies

```cmd
npm run setup:local
```

If `setup:local` fails on Node version, upgrade Node to 22+ first.

### 4. Verify local stack

```cmd
npm run verify:stack:local
```

### 5. Continue setup

Follow [stack-setup.md](./stack-setup.md) — Phase 4 (env files + `npm run setup:cloud`).

---

## Master installer (all phases available)

```bash
npm run install:project
```

Runs Phase 1 local CLIs, Phase 2 worker deps, and Phase 3 frontend deps (with progress output).

Individual phases:

```bash
npm run setup:worker
npm run setup:frontend
```

---

## Phase 4 — Environment files (you copy; installer does not)

After Phases 1–3, create cloud projects and copy these files **yourself** (never commit the copies):

```bash
cp .env.example .env
cp worker/.dev.vars.example worker/.dev.vars
cp worker/.cloudflare.env.example worker/.cloudflare.env
```

Then paste keys from each provider dashboard (tables below), **or** export the same variables in your shell / CI. **Do not run `npm run setup:cloud` until required keys are set** (files and/or environment — see [external-auth.md](./external-auth.md)).

### Supabase keys → where to paste

In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Project Settings → API** (or **API Keys**):

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

### E2E-only keys (optional — not needed for `npm run dev`)

Only when you run isolated Playwright tests (`npm run test:e2e` / `test:e2e:ui`), add to `worker/.dev.vars`:

- `SUPABASE_ACCESS_TOKEN` — [account token](https://supabase.com/dashboard/account/tokens)
- `SUPABASE_ORG_SLUG` — org slug from dashboard URL (`…/org/<slug>/…`)

Playwright on WSL: [playwright-wsl-setup.md](./playwright-wsl-setup.md) (npm in repo — **not** a Cursor plugin).

Optional: `npm run verify:github-actions` — checks if GitHub Actions can run on `origin` (nice-to-have).

### Cloudflare scoped API token (required)

We do **not** use the legacy Global API Key + email. Use a **scoped API token** in `worker/.cloudflare.env` or in the environment (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`).

For **CI** (`CI=true`), export those variables — browser OAuth is not used. Optional desktop **`wrangler login`** is only for local quick start without a token. See [cloudflare-auth.md](./cloudflare-auth.md) and [external-auth.md](./external-auth.md).

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. **My Profile → API Tokens → Create Token**.
3. Use **Create Custom Token** (or a template that includes Workers + Account read).
4. Suggested permissions (minimum for local wrangler + later deploy):
   - **Account** — Account Settings: **Read**
   - **Account** — Workers Scripts: **Edit** (or Workers R2 / Pages if you use those later)
5. **Account Resources** — include your account.
6. Create token and copy it once (shown only once).

Paste into `worker/.cloudflare.env`:

```env
CLOUDFLARE_API_TOKEN=your-token-here
CLOUDFLARE_ACCOUNT_ID=your-account-id
```

**Account ID:** Fastest path — open the Cloudflare dashboard **search bar** (top), type **account id**, and use the **Copy account ID** action. Alternatively: any zone or Workers overview → right sidebar **Account ID**.

Both `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are required for `npm run setup:cloud` and `npm run verify:stack:cloud`.

### Cloudflare authentication

`npm run setup:cloud` and `scripts/ensure-cloudflare-auth.sh`:

1. Use existing Wrangler session if already authenticated
2. Prefer `CLOUDFLARE_API_TOKEN` from the environment, else `worker/.cloudflare.env`
3. Run `wrangler whoami` with the token
4. On desktop only (not `CI=true`): optional `wrangler login` if no token

`npm run verify:stack:cloudflare` checks the token path (env or file); it does not run OAuth.

### Phase 4 commands

```bash
# After env files exist and keys are pasted:
npm run setup:cloud

npm run verify:stack:cloud
```

Individual checks:

```bash
npm run verify:stack:env
npm run verify:stack:cloudflare
npm run verify:stack:github
npm run db:schema               # Phase 5 — empty DB only (see database-setup.md)
npm run db:seed                 # Phase 5 — demo users (see database-setup.md)
npm run verify:stack:supabase   # Phase 5 — tables + secret key
```

While still copying keys (files exist but values empty):

```bash
SKIP_CLOUD_VERIFY=1 npm run setup:cloud   # Cloudflare auth only
```

---

## After install

| Task | Command |
|------|---------|
| Full stack checklist | [stack-setup.md](./stack-setup.md) |
| Master installer | `npm run install:project` |
| Phase 4 cloud + env | `npm run setup:cloud` |
| Worker API deps | `npm run setup:worker` |
| Frontend deps | `npm run setup:frontend` |
| Frontend dev | `npm run dev` (port 5173) |
| Worker dev server | `cd worker && npm run dev` (port 8787) |
| Verify scaffold | `npm run verify:stack:scaffold` |
| Verify local tools | `npm run verify:stack:local` |
| Verify Phase 4 cloud | `npm run verify:stack:cloud` |
| Wrangler (project-local) | `cd worker && npx wrangler --version` |
| Supabase CLI | `npx supabase --version` |
