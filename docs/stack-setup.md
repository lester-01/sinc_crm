[← Back to README — Documentation](../README.md#documentation)

# Stack setup & verification

Verification commands and installer reference. **Onboarding:** start with [quick-start.md](./quick-start.md).

Related: [database-setup.md](./database-setup.md), [external-auth.md](./external-auth.md), [testing-guide.md](./testing-guide.md)

---

## Installers

| Command | Purpose |
|---------|---------|
| `npm run install:linux` | nvm, Node 22, wrangler + supabase CLI, project deps |
| `npm run setup:local` | CLIs + deps only (Node 22+ already active) |
| `npm run install:project` | Master — local + worker + frontend deps |
| `npm run setup:worker` | Worker runtime packages |
| `npm run setup:frontend` | Vite/React packages at repo root |
| `npm run setup:cloud` | Env check, Cloudflare auth, cloud verify |
| `npm run db:schema` | Apply schema SQL (empty Supabase project) |
| `npm run db:seed` | Demo users + CRM sample data |
| `npm run test:e2e` | Isolated Playwright suite |
| `npm run test:worker` | Vitest in `worker/` |

Override install phases: `INSTALL_PROJECT_PHASES=local,worker npm run install:project`

Skip verify during install: `SKIP_VERIFY=1 npm run install:linux`

Skip cloud verify while filling keys: `SKIP_CLOUD_VERIFY=1 npm run setup:cloud`

---

## Verification commands

```bash
npm run verify:stack:local       # Node 22, wrangler, supabase CLI
npm run verify:stack:scaffold    # Worker + frontend scaffold
npm run verify:stack:env         # Env files and keys
npm run verify:stack:cloudflare  # Cloudflare token / whoami
npm run verify:stack:github      # GitHub remote configured
npm run verify:stack:supabase    # Schema + tables + secret key
npm run verify:stack:cloud       # Phase 4 bundle (env + cloud + github)
npm run verify:stack:full        # All phases
npm run verify:stack:deploy      # Production API health (after deploy)
npm run verify:github-actions    # Optional — Actions readiness on origin
```

Dev servers:

```bash
npm run dev                   # frontend :5173
cd worker && npm run dev      # API :8787
```

---

## Repo layout

Per [architecture.md](../project_requirements/architecture.md):

```txt
src/          # Vite + React SPA
worker/       # Hono API at /api
e2e/          # Playwright specs
supabase/     # Schema SQL
scripts/      # Install, deploy, E2E orchestration
```

**Data flow:** CRM HTTP via **Worker** + TanStack Query; Supabase client for **Auth + Realtime** only.

---

## What's next

- **Deploy:** [deploy-guide.md](./deploy-guide.md)
- **Deferred CI:** [ci-e2e-recipe.md](./ci-e2e-recipe.md), [roadmap.md](./roadmap.md)

---

## Cost

| Provider | MVP |
|----------|-----|
| Supabase Free | $0 |
| Cloudflare Free | $0 |
| GitHub public | $0 |
