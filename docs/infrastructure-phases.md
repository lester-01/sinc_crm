# Infrastructure phases

Three user-facing phases plus optional checks. Script details: [script-reference.md](./script-reference.md).

| Phase | Purpose | Needs account? | Setup | Verify |
|-------|---------|----------------|-------|--------|
| **P1 Local** | Run app on localhost | Supabase (free) | `setup:local` → `setup:supabase` → `db:*` | `verify:local`, `verify:supabase` |
| **P2 GitHub** | Remote + future CI | GitHub (when pushing) | Manual `git remote` | `verify:github` (stub, WARN) |
| **P3 Cloudflare** | Deploy Worker + Pages | Cloudflare | `setup:cloudflare` → `deploy:*` | `verify:cloudflare`, `verify:deploy` |

## P1 layers (machine)

| Layer | Setup | Verify |
|-------|-------|--------|
| Platform | — | `verify:linux` |
| Node 22 | `setup:node` | `verify:node` |
| CLI tooling | `setup:cli` | `verify:cli` |
| Bundle | **`setup:local`** | **`verify:local`** |

## Optional

| Check | Command |
|-------|---------|
| Repo scaffold | `verify:scaffold` |
| Full maintainer | `verify:all` |
| GitHub Actions readiness | `verify:github-actions` (stub) |

Local dev does **not** require Cloudflare or GitHub.
