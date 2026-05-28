# Project guide (comprehensive)

**Short onboarding:** use the root **`README.md`** (setup + run tests only).

This guide is the **long-form** reference: architecture, phases, security constraints, testing, deployment, and assessment context. It is built incrementally from [phases/](./phases/) docs and compiled in **Phase 12**.

---

## Status

| Section | Status |
|---------|--------|
| Infrastructure (Phases 1–5) | See [database-setup.md](./database-setup.md), [stack-setup.md](./stack-setup.md) |
| Build phases 6–14 | See [build-plan.md](./build-plan.md) + [phases/README.md](./phases/README.md) |
| Testing | [testing-plan.md](./testing-plan.md) |
| CI (deferred) | [ci-e2e-recipe.md](./ci-e2e-recipe.md) |
| E2E artifacts | [e2e-artifacts.md](./e2e-artifacts.md) |
| Application features | *Filled in as phases complete* |

---

## Planned sections (Phase 12 compile)

1. Overview and goals  
2. Architecture and data flow  
3. Environment variables (all files)  
4. Database schema, seed, demo users  
5. Local development workflow  
6. Running Playwright tests locally  
7. Role model and authorization matrix  
8. API reference summary  
9. Realtime behavior  
10. Deployment (Cloudflare)  
11. CI/CD (`sinc-ci-e2e-*` ephemeral projects)  
12. Evaluation checklist mapping  
13. Troubleshooting  

Do not duplicate full content here until Phase 12 — link to phase docs and [testing-plan.md](./testing-plan.md) during build.
