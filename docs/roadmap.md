# Roadmap (post-MVP / assessment)

Items we **intentionally deferred** for the one-week MVP, with brief rationale.

---

## Security & Auth

| Item | Notes |
|------|--------|
| **Strong password policy** | Demo uses a single simple password (`demo1234`) for all seeded accounts via `SEED_DEMO_PASSWORD`. Production should enforce length, complexity, and rotation. |
| **Email verification** | **Disabled on purpose** for demo (see [database-setup.md](./database-setup.md)). Re-enable for production signups. |
| **Social logins** | Google/GitHub OAuth providers — nice for onboarding; not required for assessment core flow. |
| **Remove Cloudflare browser OAuth** | Token-only auth for headless deploy; see [cloudflare-auth.md](./cloudflare-auth.md). |

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
