[← Back to README — Future work](../README.md#future-work)

# Roadmap (post-MVP)

Items **intentionally deferred** after the initial MVP, with brief rationale.

---

## Tooling & CI (priority)

| Item | Notes |
|------|--------|
| **GitHub Actions auth ladder — finish testing** | `verify-github-actions` flow (env token → `gh` OAuth) not fully exercised yet; align with [external-auth.md](./external-auth.md) after Phase 12. May complete same day as remaining phases. |
| **GitHub Actions E2E workflow** | `.github/workflows/e2e.yml` using `e2e-run.mjs` — see [ci-e2e-recipe.md](./ci-e2e-recipe.md) |
| **Production deploy via GitHub → Cloudflare** | Valid alternative to manual Wrangler CLI ([deploy-guide.md](./deploy-guide.md)): Pages git integration + Actions for Worker. Repo uses CLI for manual deploy now; both paths planned. |
| **Two-pass `deploy-all` script** | Automate Pass 1 + Pass 2 (capture URLs, set `CORS_ORIGINS`, Supabase Auth checklist) after manual deploy is proven — see [deploy-guide.md](./deploy-guide.md#planned-automation-not-in-repo-yet) |

---

## Security & Auth (application)

| Item | Notes |
|------|--------|
| **Strong password policy** | Demo uses a single simple password (`demo1234`) for all seeded accounts via `SEED_DEMO_PASSWORD`. Production should enforce length, complexity, and rotation. |
| **Email verification** | **Disabled on purpose** for demo (see [database-setup.md](./database-setup.md)). Re-enable for production signups. |
| **Social logins** | Google/GitHub OAuth providers — nice for onboarding; not required for core MVP flow. |

---

## Database & operations

| Item | Notes |
|------|--------|
| **Formal Supabase migrations** | Move `supabase/schema/*.sql` into `supabase/migrations/` with CLI tracking; document upgrade path. |
| **Rollback / down migrations** | Not implemented; recovery = fresh project + schema + seed. |
| **Separate seed project automation** | Optional second Supabase project for demos without touching dev data. |
| **Index tuning** | Add/remove indexes after real query patterns under load. |
| **Production guardrails** | Stricter checks than “empty DB only” (environment banners, read-only prod, etc.). |

---

## Product (out of scope in requirements)

- Drag-and-drop pipeline
- File upload, email, payments
- Advanced reporting and notifications
