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

### Phase 4 — Cloud accounts + credentials (complete)

Merged former phases 4 and 5. **Installers do not copy env files** — you copy examples and paste keys first.

- [x] **GitHub** public repo; remote `origin` configured
- [x] **Supabase** project created ([dashboard](https://supabase.com/dashboard))
- [x] **Cloudflare** account created; scoped API token in `worker/.cloudflare.env`
- [x] Copy env examples (see [quick-start.md](./quick-start.md) — Environment files):
  - [x] `.env.example` → `.env` (`VITE_SUPABASE_PUBLISHABLE_KEY`)
  - [x] `worker/.dev.vars.example` → `worker/.dev.vars` (`SUPABASE_SECRET_KEY`)
  - [x] `worker/.cloudflare.env.example` → `worker/.cloudflare.env`
- [x] Paste Supabase + Cloudflare keys into those files
- [x] Run **`npm run verify:stack:cloud`** — all checks pass

Cloudflare: **scoped API token only** for setup/verify. OAuth/`wrangler login` is deprecated ([cloudflare-auth.md](./cloudflare-auth.md)).

### Phase 5 — Supabase database (complete)

- [x] SQL schema + indexes — `supabase/schema/` ([database.md](../project_requirements/database.md))
- [x] RLS + Realtime publication + profile bootstrap trigger
- [x] Auth: disable email confirmation for demo ([database-setup.md](./database-setup.md))
- [x] Seeds: 2 managers, 3 sales, 4 clients (`npm run db:seed`)
- [x] Run: `npm run verify:stack:supabase`

**Guide:** [database-setup.md](./database-setup.md) · **Future work:** [roadmap.md](./roadmap.md)

```bash
npm run db:schema    # empty DB only — needs SUPABASE_DB_URL (transaction pooler) in worker/.dev.vars
npm run db:seed
npm run verify:stack:supabase
```

### Phase 6 — Deploy & submission

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
| `npm run setup:cloud` | **Phase 4:** env check, Cloudflare auth, `verify:stack:cloud` |
| `npm run db:schema` | **Phase 5:** apply schema SQL (empty DB) |
| `npm run db:seed` | **Phase 5:** demo users + CRM data (empty DB) |
| `npm run install:project` | Master — `local`, `worker`, `frontend` (default; no env copy) |

Override phases: `INSTALL_PROJECT_PHASES=local,worker npm run install:project`

Skip cloud verify while filling keys: `SKIP_CLOUD_VERIFY=1 npm run setup:cloud`

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
npm run verify:stack:cloud      # Phase 4 — env + GitHub + Cloudflare + Supabase keys
npm run dev                   # frontend :5173
cd worker && npm run dev      # API :8787
```

**Phases 1–5 complete.** **Current:** Phase 6 — deploy Worker + Pages and submission.

---

## Cost

| Provider | MVP |
|----------|-----|
| Supabase Free | $0 |
| Cloudflare Free | $0 |
| GitHub public | $0 |
