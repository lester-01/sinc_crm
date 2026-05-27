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

### Phase 2 — Backend scaffold (`worker/`) (complete)

- [x] Run **`npm run setup:worker`**
- [x] Hono API per [architecture.md](../project_requirements/architecture.md)
- [x] `cd worker && npm run dev` — `GET http://localhost:8787/api/health`
- [x] `npm run verify:stack:scaffold` — worker checks pass

### Phase 3 — Frontend scaffold (root `src/`) (complete)

- [x] Run **`npm run setup:frontend`** — Vite, React, TypeScript, Router, TanStack Query, Tailwind, shadcn base
- [x] Layout matches [architecture.md](../project_requirements/architecture.md) (`src/app`, `src/pages`, `src/lib`, `src/features`, `src/components`)
- [x] Manual **`supabaseClient.ts`** + **`apiClient.ts`** (no Supabase shadcn registry)
- [x] `npm run dev` — Vite on `http://localhost:5173`
- [x] `npm run verify:stack:scaffold` — frontend checks pass

### Phase 4 — Cloud accounts

- [ ] **GitHub** public repo; remote `origin` configured
- [ ] **Supabase** project created
- [ ] **Cloudflare** account created
- [ ] `cd worker && npx wrangler login`
- [ ] Run: `npm run verify:stack:cloudflare`

### Phase 5 — Environment files

- [ ] Copy [.env.example](../.env.example) → `.env`
- [ ] Copy [worker/.dev.vars.example](../worker/.dev.vars.example) → `worker/.dev.vars`
- [ ] Fill Supabase URL and keys
- [ ] Run: `npm run verify:stack:env`

### Phase 6 — Supabase database

- [ ] SQL schema + indexes ([database.md](../project_requirements/database.md))
- [ ] Auth, Realtime, profiles bootstrap, seeds
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
| `npm run setup:local` | Phase 1 CLIs only |
| `npm run setup:worker` | Phase 2: Worker runtime packages |
| `npm run setup:frontend` | Phase 3: Vite/React packages at repo root |
| `npm run install:project` | **Master** — `local`, `worker`, `frontend` (default) |

Override phases: `INSTALL_PROJECT_PHASES=local,worker npm run install:project`

---

## Architecture (repo layout)

Per [architecture.md](../project_requirements/architecture.md) — **no `frontend/` wrapper**:

```txt
src/                       # Phase 3 — Vite + React SPA
  app/                     router.tsx, queryClient.ts
  components/              layout/, ui/
  features/                auth/, clients/, conversations/, deals/, dashboard/
  lib/                     apiClient.ts, supabaseClient.ts, realtime.ts
  pages/                   LoginPage, DashboardPage, …

worker/                    # Phase 2 — Hono API at /api
  src/                     …
```

**Data flow:** CRM HTTP via **Worker** + TanStack Query; **Supabase client** for Auth + Realtime only.

---

## Verification tests

```bash
npm run verify:stack:scaffold
npm run verify:stack:local
npm run dev                  # frontend :5173
cd worker && npm run dev     # API :8787
```

**Phases 1–3 complete.** **Next:** Phase 4 cloud accounts.

---

## Cost

| Provider | MVP |
|----------|-----|
| Supabase Free | $0 |
| Cloudflare Free | $0 |
| GitHub public | $0 |
