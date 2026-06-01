[← Back to README — Documentation](../README.md#documentation)

# Infrastructure phases (1–5)

How setup scripts map to bootstrap steps. **Canonical walkthrough:** [quick-start.md](./quick-start.md).

| Phase | Goal | Scripts | Verify |
|-------|------|---------|--------|
| 1 — Local tools | Node 22, npm, git, wrangler, supabase CLI | `install:linux`, `setup:local` | `verify:stack:local` |
| 2 — Worker | Hono API scaffold in `worker/` | `setup:worker` | `verify:stack:scaffold` |
| 3 — Frontend | Vite/React in `src/` | `setup:frontend` | `verify:stack:scaffold` |
| 4 — Cloud env | `.env`, `worker/.dev.vars`, Cloudflare token | `setup:cloud` | `verify:stack:cloud` |
| 5 — Database | Schema + seed | `db:schema`, `db:seed` | `verify:stack:supabase` |

Auth ladder for scripts: [external-auth.md](./external-auth.md). Database detail: [database-setup.md](./database-setup.md).

Application features and tests: [testing-guide.md](./testing-guide.md), [development-guide.md](./development-guide.md).
