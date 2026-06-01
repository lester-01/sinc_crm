# Documentation index

**Onboarding:** start at the root [README.md](../README.md).

| Doc | Purpose |
|-----|---------|
| [api/openapi.yaml](./api/openapi.yaml) | **API reference (OpenAPI 3.1)** — routes, schemas, role permissions, examples |
| [api/index.html](./api/index.html) | Interactive API docs (Scalar viewer; serve `docs/api/` locally) |
| [api/authentication.md](./api/authentication.md) | Auth flow, demo users, error codes |
| [quick-start.md](./quick-start.md) | **Canonical P1 setup** — machine, Supabase, database, dev servers |
| [development-guide.md](./development-guide.md) | How to work on the repo — features, tests, branch policy |
| [project-guide.md](./project-guide.md) | Architecture, roles, troubleshooting |
| [script-reference.md](./script-reference.md) | All `setup:*` and `verify:*` commands |
| [infrastructure-phases.md](./infrastructure-phases.md) | P1 Local · P2 GitHub · P3 Cloudflare |
| [database-setup.md](./database-setup.md) | Schema, seed, credentials, reset |
| [security-architecture.md](./security-architecture.md) | RLS, keys, threat model, design defense |
| [external-auth.md](./external-auth.md) | Tooling auth ladder (env / files / CI) |
| [cloudflare-auth.md](./cloudflare-auth.md) | Cloudflare token permissions, Pages hostname |
| [testing-guide.md](./testing-guide.md) | Test catalog (60 E2E + Vitest), how to add tests |
| [testing-plan.md](./testing-plan.md) | Security matrix, isolated E2E philosophy |
| [deploy-guide.md](./deploy-guide.md) | Two-pass manual deploy (CLI) |
| [roadmap.md](./roadmap.md) | Post-MVP / deferred items |
| [playwright-wsl-setup.md](./playwright-wsl-setup.md) | Playwright on WSL |
| [e2e-artifacts.md](./e2e-artifacts.md) | Per-test artifacts under `test-results/` |
| [ci-e2e-recipe.md](./ci-e2e-recipe.md) | GitHub Actions E2E (deferred) |
| [pipeline-stages.md](./pipeline-stages.md) | Deal stage rules and transitions |
| [deal-lifecycle.md](./deal-lifecycle.md) | Won/lost/reopen, lost reason |

Product requirements: [project_requirements/README.md](../project_requirements/README.md)
