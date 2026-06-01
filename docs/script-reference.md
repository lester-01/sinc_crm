[← Back to README](../README.md#documentation)

# Script reference

Canonical map of `npm run` setup and verify commands. Naming rule: **`setup:*`** mutates; **`verify:*`** checks.

Three phases: **P1 Local** (machine + Supabase) · **P2 GitHub** (manual, verify stubbed) · **P3 Cloudflare** (deploy).

---

## Layer model (P1 machine)

```text
verify:linux  →  setup:node / verify:node  →  setup:cli / verify:cli
                         ↓
              setup:local / verify:local (orchestrators)
                         ↓
              setup:supabase / verify:supabase
```

| Script | Mutates? | Purpose |
|--------|--------|---------|
| `verify:linux` | No | Linux/WSL, git, curl |
| `setup:node` | Yes | nvm + Node 22 + shell config |
| `verify:node` | No | Node >= 22, npm |
| `setup:cli` | Yes | `npm install` root + worker (wrangler, supabase CLI, app deps) |
| `verify:cli` | No | wrangler + supabase binaries respond |
| **`setup:local`** | Yes | **One-shot:** verify:linux → setup:node → setup:cli → verify:local |
| **`verify:local`** | No | Composite: linux + node + cli |

`SKIP_VERIFY=1` on `setup:local` or `setup:supabase` skips the final verify step.

---

## P1 credentials (Supabase)

| Script | Purpose |
|--------|---------|
| **`setup:supabase`** | `require-supabase` → `verify:supabase` |
| **`verify:supabase`** | Env files → live API ping → schema tables (internal steps: `env`, `supabase-connect`, `supabase`) |
| `db:schema` | Apply SQL to hosted Supabase |
| `db:seed` | Demo users and sample data |

**Files:** `.env` (frontend keys), `worker/.dev.vars` (worker secrets). See [quick-start.md](./quick-start.md).

**Internal modules (not npm scripts):**

- `scripts/lib/require-supabase.mjs` — fast gate before setup/DB/deploy
- `scripts/lib/require-cloudflare.mjs` — fast gate before Cloudflare setup/deploy

---

## P2 GitHub (stub)

Manual: `git remote add origin <url>`.

| Script | Exit code | Notes |
|--------|-----------|-------|
| `verify:github` | 0 (WARN on gaps) | Stub banner; runs remote/fetch checks when configured |
| `verify:github-actions` | 0 unless `--strict` | CI readiness stub; OAuth deferred |

Use `--strict` on either command to fail on warnings (future CI).

---

## P3 Cloudflare (deploy)

| Script | Purpose |
|--------|---------|
| **`setup:cloudflare`** | require-cloudflare → ensure-cloudflare-auth → verify:cloudflare |
| **`verify:cloudflare`** | Token configured; wrangler whoami |
| `deploy:worker` / `deploy:pages` / `deploy:all` | Publish Worker + Pages |
| **`verify:deploy`** | Production API health (`VITE_API_BASE_URL`) |

**File:** `worker/.cloudflare.env`. See [deploy-guide.md](./deploy-guide.md).

`deploy:all` calls `require-supabase` then `require-cloudflare` before deploy.

---

## Project deps (optional)

| Script | Purpose |
|--------|---------|
| `setup:project` | cli + worker + frontend phases |
| `setup:worker` | Worker npm packages |
| `setup:frontend` | Root npm packages (Vite/React) |
| `verify:scaffold` | Repo layout check (no `setup:scaffold`) |

Override phases: `SETUP_PROJECT_PHASES=cli,worker npm run setup:project`

---

## Maintainer

| Script | Phases included |
|--------|-----------------|
| `verify:all` | local + supabase + cloudflare + github (stub) + scaffold |
| `verify:scaffold` | Worker + frontend files present |

---

## Verify engine

Implementation: [`scripts/verify-setup.mjs`](../scripts/verify-setup.mjs)

```bash
node scripts/verify-setup.mjs --phase=linux,node,cli
node scripts/verify-setup.mjs --phase=env,supabase-connect,supabase
node scripts/verify-setup.mjs --phase=github --strict
```

---

## Related docs

| Doc | Content |
|-----|---------|
| [quick-start.md](./quick-start.md) | P1 happy path |
| [deploy-guide.md](./deploy-guide.md) | P3 deploy |
| [stack-setup.md](./stack-setup.md) | Phase checklist |
| [external-auth.md](./external-auth.md) | Credential matrix |
| [infrastructure-phases.md](./infrastructure-phases.md) | Phase overview |
