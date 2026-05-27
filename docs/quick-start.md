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

### 5. Log in to cloud CLIs (when ready)

```cmd
cd worker
npx wrangler login
cd ..
npx supabase login
```

### 6. Continue setup

Follow [stack-setup.md](./stack-setup.md) for Supabase, Cloudflare, and environment files.

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

## After install

| Task | Command |
|------|---------|
| Full stack checklist | [stack-setup.md](./stack-setup.md) |
| Master installer | `npm run install:project` |
| Worker API deps | `npm run setup:worker` |
| Frontend deps | `npm run setup:frontend` |
| Frontend dev | `npm run dev` (port 5173) |
| Worker dev server | `cd worker && npm run dev` (port 8787) |
| Verify scaffold | `npm run verify:stack:scaffold` |
| Verify local tools | `npm run verify:stack:local` |
| Wrangler (project-local) | `cd worker && npx wrangler --version` |
| Supabase CLI | `npx supabase --version` |
