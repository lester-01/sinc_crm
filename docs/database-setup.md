# Database setup (Phase 5)

This guide explains **what we built**, **why**, and **how to run it safely** on an **empty** Supabase project.

Related: [project_requirements/database.md](../project_requirements/database.md), [stack-setup.md](./stack-setup.md), [roadmap.md](./roadmap.md)

---

## What Phase 5 delivers

| Piece | Location | Purpose |
|-------|----------|---------|
| Schema SQL (ordered) | `supabase/schema/01` … `05` | Types, tables, indexes, profile bootstrap, RLS + Realtime |
| Apply schema | `npm run db:schema` | DDL on **empty** DB only |
| Seed data | `npm run db:seed` | Demo auth users + CRM rows on **empty** DB only |
| Verify | `npm run verify:stack:supabase` | Tables exist + secret key can read `profiles` |

We **do not** use Supabase CLI migration history (`supabase/migrations/`) in this phase. The assessment README asks for “migrations” in documentation sense: **versioned SQL you can re-apply on a fresh project**. See [Schema scripts vs migrations](#schema-scripts-vs-migrations) below.

---

## Design decisions (and how we defend them)

### 1. Spec tables + small, justified additions

The core model matches [database.md](../project_requirements/database.md) and the API in [api.md](../project_requirements/api.md): profiles, clients (nullable `profile_id`), conversations, messages, deals, stage history, notes.

**Additions on top of the spec:**

| Change | Rationale |
|--------|-----------|
| `clients.email` **UNIQUE** | Prevents duplicate CRM rows; supports client lookup and demo integrity. |
| Index on `conversation_threads.last_message_at DESC` | Inbox/queue sorted by recent activity (common sales workflow). |
| `handle_new_user` trigger | Every `auth.users` row gets a `profiles` row; role from signup metadata (default `client`). |
| RLS **SELECT** policies | Browser uses **publishable key + JWT** for Realtime; without RLS, chat/CDC is unsafe or broken. |
| Realtime publication | Tables listed in api.md are added to `supabase_realtime`. |

**Writes** stay on the **Hono Worker** with `SUPABASE_SECRET_KEY` (bypasses RLS). RLS is not a substitute for Worker authorization; it secures **read/Realtime** paths and adds defense in depth.

### 2. Two-step apply: schema, then seed

- **`db:schema`** — structure only (DDL, functions, policies, publication).
- **`db:seed`** — Auth users + demo CRM graph.

Separating them lets you reset **data** without replaying DDL, and keeps “structure” vs “demo content” clear for reviewers.

### 3. Empty-database lock (no auto-nuke)

| Script | Aborts when | User action to proceed |
|--------|-------------|------------------------|
| `db:schema` | `profiles` table already exists | Dashboard → SQL Editor: drop public schema objects (or use a new empty project), then re-run |
| `db:seed` | Any auth user or rows in `profiles` / `clients` | Dashboard → delete Auth users and truncate/delete public rows (or fresh project + schema), then re-run |

Scripts **never** `DROP DATABASE`, `TRUNCATE`, or `db reset` on your linked project. This is intentional: **do not develop on production**; use a dedicated dev Supabase project.

We are **not** using “create a second project and seed that” automation yet — keeps the workflow simple.

### 4. Email confirmation disabled (demo only)

For the assessment demo we **disable email confirmation** in Supabase Auth so you can:

- Log in immediately with seeded `@demo.local` users.
- Register extra fake clients during the video without inbox friction.

**This is deliberate and documented.** It weakens account security and must not be copied to production. See [roadmap.md](./roadmap.md).

**Dashboard steps (one-time per project):**

1. Supabase Dashboard → **Authentication** → **Providers** → **Email**
2. Turn **off** “Confirm email” / enable sign-in without confirmation (wording varies)
3. Save

Seeded users are created with `email_confirm: true` via Admin API so they are active immediately.

### 5. Demo password policy

| Account type | Password |
|--------------|----------|
| All demo users (managers, sales, clients) | `demo1234` by default |

Override for a run:

```bash
SEED_DEMO_PASSWORD='your-temp-password' npm run db:seed
```

**Roadmap:** enforce strong passwords and per-environment secrets ([roadmap.md](./roadmap.md)).

### 6. Seed composition (your requirements)

| Role | Count | Emails |
|------|------:|--------|
| Manager | 2 | `manager1@demo.local`, `manager2@demo.local` |
| Sales | 3 | `sales1@demo.local` … `sales3@demo.local` |
| Client | 4 | `client1@demo.local` … `client4@demo.local` |

**Conversations**

- `client1`–`client3`: threads **assigned** to `sales1`–`sales3`.
- `client4`: thread **unassigned** (open queue).
- Extra CRM-only row: `prospect.no.login@example.com` (no auth) — demonstrates `clients.profile_id = NULL`.

**Deals (different stages)**

- `client1` → `new_lead` (owner: sales1)
- `client2` → `contacted` (owner: sales2)
- `client3` → `consultation_booked` (owner: sales3)
- `client4` → no deal (unassigned client)

Each deal with a stage includes `deal_stage_history` and a `deal_note`.

---

## Schema scripts vs migrations

**What people call “migrations”:** ordered, versioned SQL that evolves the database over time.

**What we ship in Phase 5:** five files in `supabase/schema/` applied in filename order by `npm run db:schema`. That satisfies the README requirement to **document** how schema is applied, without Supabase migration tracking yet.

| Approach | Rollback? | Our choice |
|----------|-----------|------------|
| Re-run old SQL backward | Only if you hand-write `DOWN` scripts | Not implemented |
| `supabase db reset` (local) | Wipes and replays | **Not** used on cloud |
| Fix forward with new SQL file | Yes (additive fix) | Future option |
| Dashboard restore / new project | Disaster recovery | Recommended for demo mistakes |

**If you “nuked” a demo DB:** migrations do not restore rows. Recovery = empty project → `db:schema` → `db:seed`, or Supabase backup (paid). **No rollback automation** in this repo by design.

When you read up on migrations later, you can adopt `supabase/migrations/` and map each `supabase/schema/*.sql` file into an initial migration — behavior stays the same for an empty database.

---

## Prerequisites

- Phase 4 complete (`verify:stack:cloud` passed).
- `.env` and `worker/.dev.vars` with Supabase URL, publishable + **secret** keys.
- For `npm run db:schema` from your machine, add **database password** to `worker/.dev.vars`:

```env
SUPABASE_DB_PASSWORD=your-database-password
```

(Full string alternative: `SUPABASE_DB_URL=postgresql://...`)

Find it: Dashboard → **Project Settings** → **Database** → database password.

---

## Commands (happy path)

```bash
# 1. One-time: disable email confirmation (dashboard, see above)

# 2. Apply schema (empty DB only)
npm run db:schema

# 3. Seed demo data (empty DB only)
npm run db:seed

# 4. Verify
npm run verify:stack:supabase
```

---

## Applying schema without local DB password

You can run the same SQL in **Supabase Dashboard → SQL Editor** (paste files in order `01` → `05`), or use the Supabase MCP `execute_sql` tool. `npm run db:schema` is the repeatable path when `SUPABASE_DB_PASSWORD` is set.

---

## Auth, Realtime, profiles bootstrap

| Concern | Implementation |
|---------|----------------|
| **Auth** | Supabase Auth; roles in `profiles`; JWT to Worker |
| **Profiles bootstrap** | `04_profile_bootstrap.sql` trigger on `auth.users` |
| **Realtime** | `05_rls_realtime.sql` policies + publication; frontend `src/lib/realtime.ts` |
| **Role enforcement (writes)** | Hono middleware (Phase 6+ feature work); DB does not replace Worker checks |

---

## Troubleshooting

**`db:schema` — schema already exists**  
Drop public tables/types/functions in SQL Editor (reverse dependency order), or start a new Supabase project.

**`db:seed` — database is not empty**  
Authentication → delete users; Table Editor → delete/truncate `profiles`, `clients`, and dependent tables; then re-seed.

**`verify:stack:supabase` — table missing**  
Run `db:schema` on an empty project.

**Realtime not firing**  
Confirm tables are in publication (`05`) and user is authenticated with a role that passes RLS `SELECT`.

---

## Files reference

```txt
supabase/schema/
  01_types.sql
  02_tables.sql
  03_indexes.sql
  04_profile_bootstrap.sql
  05_rls_realtime.sql
scripts/
  db-apply-schema.mjs
  db-seed.mjs
  lib/load-stack-env.mjs
  lib/supabase-db-check.mjs
  lib/pg-exec.mjs
```
