[← Back to README — Documentation](../README.md#documentation)

# Infrastructure phases (1–5)

How the repo was bootstrapped before feature work (Phases 6–11). Feature phases: [phases/README.md](./phases/README.md), [build-plan.md](./build-plan.md).

---

## Phase 1 — Local toolchain

| Item | Detail |
|------|--------|
| Goal | Node 22, npm, git, Wrangler + Supabase CLIs |
| Scripts | `npm run install:linux`, `scripts/install.sh` |
| Verify | `npm run verify:stack:local` |
| Docs | [quick-start.md](./quick-start.md) (Linux/WSL section) |

Installs **nvm** + Node from `.nvmrc`, `worker/` Wrangler, root Supabase CLI. Does **not** copy env files.

---

## Phase 2 — Worker API scaffold

| Item | Detail |
|------|--------|
| Layout | `worker/` — Hono app, `/api/health`, route modules |
| Dev | `cd worker && npm run dev` → `http://localhost:8787` |
| Verify | `npm run verify:stack:scaffold` (with full phase set) |
| Auth | Supabase JWT on protected routes (implemented in later phases) |

---

## Phase 3 — Frontend scaffold

| Item | Detail |
|------|--------|
| Layout | `src/` — Vite, React Router, TanStack Query, shadcn-style UI |
| Dev | `npm run dev` → `http://localhost:5173` |
| Env | `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_API_BASE_URL` in `.env` |

Data flow: browser talks to **Worker** for CRM HTTP; Supabase client for **Auth + Realtime** only.

---

## Phase 4 — Cloud env & credentials

| Item | Detail |
|------|--------|
| Files | `.env`, `worker/.dev.vars`, `worker/.cloudflare.env` (optional if env has all keys) |
| Scripts | `npm run setup:cloud`, `scripts/ensure-cloudflare-auth.sh` |
| Verify | `npm run verify:stack:cloud`, `verify:stack:cloudflare` |
| Auth ladder | [external-auth.md](./external-auth.md) — env overrides files; `CI=true` skips OAuth |

You copy example files and paste dashboard keys, or export the same variables for CI.

---

## Phase 5 — Database

| Item | Detail |
|------|--------|
| Schema | `supabase/migrations/` applied via `npm run db:schema` |
| Seed | `npm run db:seed` — demo users, clients, threads, deals |
| Verify | `npm run verify:stack:supabase` |
| Deep dive | [database-setup.md](./database-setup.md) |

Requires `SUPABASE_SECRET_KEY` (service role) in `worker/.dev.vars` or environment. Demo password default: `demo1234`.

---

## After Phase 5

Application features are built in Phases 6–11 (auth, clients, chat, deals, dashboard, polish). Testing: [testing-guide.md](./testing-guide.md). Current stack checklist: [stack-setup.md](./stack-setup.md).
