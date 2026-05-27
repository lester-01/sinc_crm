# Stack Setup Guide — Student CRM

Everything you need **installed locally** and **provisioned in the cloud** before building the app. Check items off as you go, then run the verification tests at the bottom.

Related: [project_requirements/README.md](../project_requirements/README.md), [project_requirements/architecture.md](../project_requirements/architecture.md), [quick-start.md](./quick-start.md)

---

## Setup checklist (check off as you go)

### Phase 1 — Local tools (complete)

- [x] **Node.js 22+** installed (`node -v` shows v22+)
- [x] **npm** available (`npm -v`)
- [x] **Git** installed (`git --version`)
- [x] Run **`npm run install:linux`** (WSL/Linux) or [quick-start.md](./quick-start.md) on Windows
- [x] Run: `npm run verify:stack:local` — all checks pass

After `install:linux`, **restart the terminal** or run `source ~/.bashrc` — see [quick-start.md](./quick-start.md).

### Phase 2 — Backend scaffold (`worker/`)

- [x] Run **`npm run setup:worker`** — Hono, Supabase JS, jose, zod, `@hono/zod-validator`
- [x] **Hono API** scaffolded per [architecture.md](../project_requirements/architecture.md) (`src/index.ts`, routes, middleware, services)
- [x] `worker/wrangler.toml` and `worker/tsconfig.json` present
- [x] `cd worker && npm run dev` — `GET http://localhost:8787/api/health` returns JSON
- [x] Run: `npm run verify:stack:scaffold` — worker checks pass

Installer: `npm run setup:worker`  
Master installer (local + worker): `npm run install:project`

### Phase 3 — Frontend scaffold (`frontend/`)

- [ ] Run **`npm run setup:frontend`** (when added) — Vite, React, TypeScript
- [ ] Tailwind + **shadcn/ui** initialized (not Supabase registry — manual `supabaseClient.ts`)
- [ ] React Router + TanStack Query installed
- [ ] Layout mirrors `frontend/src/` structure in [architecture.md](../project_requirements/architecture.md)
- [ ] Run: `npm run verify:stack:scaffold` — frontend package detected

### Phase 4 — Cloud accounts

- [ ] **GitHub** public repo; remote `origin` configured
- [ ] **Supabase** project created
- [ ] **Cloudflare** account created
- [ ] `cd worker && npx wrangler login`
- [ ] Run: `npm run verify:stack:cloudflare`

### Phase 5 — Environment files

- [ ] Copy [.env.example](../.env.example) → `.env`
- [ ] Copy [worker/.dev.vars.example](../worker/.dev.vars.example) → `worker/.dev.vars`
- [ ] Fill Supabase URL and keys (anon/publishable in `.env`, service role in `.dev.vars` only)
- [ ] Run: `npm run verify:stack:env`

### Phase 6 — Supabase database

- [ ] SQL schema + indexes ([database.md](../project_requirements/database.md))
- [ ] Auth email provider; redirect URLs for `http://localhost:5173`
- [ ] Realtime enabled on CRM tables
- [ ] Profiles bootstrap + seed data + demo users
- [ ] Run: `npm run verify:stack:supabase`

### Phase 7 — Deploy & submission

- [ ] Worker + Pages deployed; README lists URLs
- [ ] Video demo + Google Form + review meeting
- [ ] Run: `npm run verify:stack:deploy`

---

## Installers

| Command | Purpose |
|---------|---------|
| `npm run install:linux` | Phase 1: nvm, Node 22, wrangler + supabase CLI |
| `npm run setup:local` | Phase 1 deps only (wrangler + supabase CLI) |
| `npm run setup:worker` | Phase 2: Worker runtime npm packages |
| `npm run install:project` | **Master** — runs enabled phase installers with progress |
| `npm run install:project` + `INSTALL_PROJECT_PHASES=local,worker` | Same (default phases) |

Future: `setup:frontend` will be called from `install:project` when Phase 3 exists.

---

## Architecture (repo layout)

```txt
worker/                    # Phase 2 — Cloudflare Worker + Hono (/api)
  src/
    index.ts
    middleware/            auth.ts, requireRole.ts
    routes/                clients, conversations, messages, deals, dashboard, users, me
    services/              *Service.ts
    lib/                   supabaseAdmin.ts

frontend/                  # Phase 3 — Vite + React (mirrors architecture src/ tree)
  src/
    app/, components/, features/, lib/, pages/
```

**Data flow:** CRM mutations and reads via **Worker**; Supabase client in browser for **Auth + Realtime** only ([architecture.md](../project_requirements/architecture.md)).

---

## Backend packages (`worker/`)

| Package | Purpose |
|---------|---------|
| hono | HTTP router on Workers |
| @supabase/supabase-js | Service-role DB + `auth.getUser(token)` |
| jose | JWT utilities (available for stricter validation later) |
| zod + @hono/zod-validator | Request body validation (use when implementing routes) |
| wrangler | Dev/deploy (devDependency) |

---

## Frontend packages (`frontend/` — Phase 3)

Vite, React, TypeScript, React Router, TanStack Query, Tailwind, shadcn/ui, `@supabase/supabase-js` (Auth + Realtime only).

---

## Environment variables

| Variable | Where |
|----------|-------|
| `VITE_SUPABASE_URL` | `.env` |
| `VITE_SUPABASE_ANON_KEY` | `.env` (or publishable key from dashboard) |
| `VITE_API_BASE_URL` | `.env` — `http://localhost:8787` in dev |
| `SUPABASE_URL` | `worker/.dev.vars` |
| `SUPABASE_SERVICE_ROLE_KEY` | `worker/.dev.vars` |

---

## Verification tests

```bash
npm run verify:stack:scaffold   # Phase 2+ worker/frontend structure
npm run verify:stack:local      # Phase 1
npm run verify:stack            # Phases applicable before deploy
```

**Phase 1 complete.** **Phase 2 complete** when scaffold verify passes. **Next:** Phase 3 frontend, then Phase 4 cloud accounts.

---

## 8. Cost

| Provider | MVP |
|----------|-----|
| Supabase Free | $0 |
| Cloudflare Free | $0 |
| GitHub public | $0 |
