[← Back to README — Documentation](../README.md#documentation)

# Database setup (Phase 5)

This guide explains **what we built**, **why**, and **how to run it safely** on an **empty** Supabase project.

Related: [project_requirements/database.md](../project_requirements/database.md), [stack-setup.md](./stack-setup.md), [external-auth.md](./external-auth.md) (env vs files for scripts), [roadmap.md](./roadmap.md)

---

## Run without Cursor or any AI agent

**Yes.** Anyone with Node 22+, this repo, and the credentials below can run:

```bash
npm run setup:local    # installs Supabase CLI at repo root
npm run db:schema      # Supabase CLI: db query --file (empty DB only)
npm run db:seed        # Supabase HTTP API via service role key (empty DB only)
npm run verify:stack:supabase
```

| Step | Tool | Needs Cursor/MCP? |
|------|------|-------------------|
| Schema + empty/exists checks | **Supabase CLI** (`npx supabase db query`) | **No** |
| Seed demo users | **@supabase/supabase-js** + `SUPABASE_SECRET_KEY` | **No** |
| Verify tables | `node scripts/verify-stack-setup.mjs` | **No** |

MCP/skills in Cursor are for **development convenience only** — they are not required for install or CI.

---

## Credentials (what to get, where to paste)

Use a **dedicated dev/demo** Supabase project — not production.

| Variable | Required for | How to get it | Paste into |
|----------|--------------|---------------|------------|
| `VITE_SUPABASE_URL` | Frontend, verify | Dashboard → **Project Settings** → **API** → Project URL | `.env` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend, verify | Same page → **Publishable** key (public) | `.env` |
| `VITE_API_BASE_URL` | Frontend | Local: `http://localhost:8787` | `.env` |
| `SUPABASE_URL` | Worker, scripts | Same Project URL as above | `worker/.dev.vars` |
| `SUPABASE_SECRET_KEY` | Worker, `db:seed`, verify | Same API page → **Secret** key (never commit) | `worker/.dev.vars` |
| `SUPABASE_DB_URL` | **`db:schema`**, CLI preflight | Dashboard → **Connect** → **Transaction pooler** (port **6543**) | `worker/.dev.vars` |
| `SUPABASE_DB_PASSWORD` | Only if URL uses `[YOUR-PASSWORD]` | Dashboard → search **`password`** → database password | `worker/.dev.vars` |
| `SEED_DEMO_PASSWORD` | `db:seed` only | You choose (default `demo1234`) | Shell env / CI secret (optional) |
| `SUPABASE_ACCESS_TOKEN` | **E2E only** (`test:e2e`) | [Account tokens](https://supabase.com/dashboard/account/tokens) | `worker/.dev.vars` — **not** needed for dev or `db:seed` |
| `SUPABASE_ORG_SLUG` | **E2E only** | Org slug in dashboard URL (`…/org/<slug>/…`) | `worker/.dev.vars` — **not** needed for dev |

**Not required:** Cloudflare keys (Phase 4). **Cannot be auto-fetched:** pooler host/region (see below). **E2E tokens** are only for isolated Playwright runs that create `sinc-ci-e2e-*` projects — see [playwright-wsl-setup.md](./playwright-wsl-setup.md).

### Transaction pooler (not direct connection)

For **serverless** (Cloudflare Workers), Supabase recommends the **Transaction pooler** (port **6543**), not the direct `db.<ref>.supabase.co` host.

Scripts use **exactly** what you paste in `SUPABASE_DB_URL` — **no hardcoded region, host, or `aws-0` / `aws-1` guessing.**

1. Dashboard → **Connect** (or **Project Settings** → **Database** → connection strings)  
2. Choose **Transaction pooler** (sometimes labeled for ORM / serverless)  
3. Copy the **URI** — it looks like:

```txt
postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@<pooler-host>:6543/postgres
```

4. Paste into `worker/.dev.vars` as `SUPABASE_DB_URL=...`

Your project’s values come **only from the dashboard** (example shape — yours may differ):

| Field | Example (your project) |
|-------|-------------------------|
| Host | `aws-1-eu-central-1.pooler.supabase.com` |
| Port | `6543` |
| User | `postgres.fgoqijltbhkrztxjebjm` |
| Database | `postgres` |

### Do you still need `SUPABASE_DB_PASSWORD`?

| `SUPABASE_DB_URL` | Also need password? |
|-------------------|---------------------|
| Full URI with password already in it | **No** |
| URI with `[YOUR-PASSWORD]` placeholder | **Yes** — set `SUPABASE_DB_PASSWORD`; script substitutes it (URL-encodes special characters) |

**CI tip:** store `SUPABASE_DB_URL` with `[YOUR-PASSWORD]` and `SUPABASE_DB_PASSWORD` as separate secrets so the URI is not committed.

### Can `SUPABASE_SECRET_KEY` fetch the pooler URL?

**No.** The secret key authenticates the **Supabase HTTP API** (Auth, REST, Realtime). It does **not** return Postgres pooler hostnames or connection strings.

Users (and CI) must **copy `SUPABASE_DB_URL` from the dashboard**. The scripts never construct pooler URLs from region or project ref.

### Database password (reset / search)

The database password is shown **only once** at project creation. If you lost it, **reset** it in **Project Settings** → **Database**, or search **`password`** in the dashboard search bar.

```env
SUPABASE_DB_PASSWORD=your-password-here
```

### How to get the secret key

1. **Project Settings** → **API** (or **API Keys**)  
2. Copy the **secret** key (`sb_secret_...`) — not the publishable key  
3. Paste as `SUPABASE_SECRET_KEY` in `worker/.dev.vars` only  

Used for seeding (Auth Admin API) and the Worker at runtime. **Never** put it in `.env` or commit it.

---

## CI example (GitHub Actions)

Store secrets in the repo (or environment):

- `SUPABASE_DB_URL` (transaction pooler URI with `[YOUR-PASSWORD]` placeholder)
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_SECRET_KEY`
- `SEED_DEMO_PASSWORD` (optional)

Check out repo, create env files from secrets, then:

```yaml
- run: npm ci
- run: npm run setup:local
- name: Write worker/.dev.vars
  run: |
    cat >> worker/.dev.vars <<EOF
    SUPABASE_URL=${{ secrets.SUPABASE_URL }}
    SUPABASE_SECRET_KEY=${{ secrets.SUPABASE_SECRET_KEY }}
    SUPABASE_DB_URL=${{ secrets.SUPABASE_DB_URL }}
    SUPABASE_DB_PASSWORD=${{ secrets.SUPABASE_DB_PASSWORD }}
    EOF
- name: Write .env
  run: |
    cat > .env <<EOF
    VITE_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY=${{ secrets.SUPABASE_PUBLISHABLE_KEY }}
    VITE_API_BASE_URL=http://localhost:8787
    EOF
- run: npm run db:schema
- run: npm run db:seed
- run: npm run verify:stack:supabase
```

Use a **throwaway Supabase project** for CI — schema/seed abort if the database is not empty.

---

## What Phase 5 delivers

| Piece | Location | Purpose |
|-------|----------|---------|
| Schema SQL (ordered) | `supabase/schema/01` … `05` | Types, tables, indexes, profile bootstrap, RLS + Realtime |
| Apply schema | `npm run db:schema` | Supabase CLI `db query` on **empty** DB only |
| Seed data | `npm run db:seed` | Demo auth users + CRM rows on **empty** DB only |
| Verify | `npm run verify:stack:supabase` | Tables exist + secret key can read `profiles` |

We **do not** use Supabase CLI migration history (`supabase/migrations/`) in this phase. The product README documents “migrations” in the sense of **versioned SQL you can re-apply on a fresh project**. See [Schema scripts vs migrations](#schema-scripts-vs-migrations) below.

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
| `db:schema` | `profiles` table already exists | [Reset database without deleting the project](#reset-database-without-deleting-the-project) — Level B, then `npm run db:schema` |
| `db:seed` | Any auth user or rows in `profiles` / `clients` | [Reset database without deleting the project](#reset-database-without-deleting-the-project) — Level A, then `npm run db:seed` |

Scripts **never** `DROP DATABASE`, `TRUNCATE`, or `db reset` on your linked project automatically. This is intentional: **do not develop on production**; use a dedicated dev Supabase project.

We are **not** using “create a second project and seed that” automation yet — keeps the workflow simple.

---

## Reset database without deleting the project

Use this when you want a **fresh database on the same Supabase project** (same URL, same API keys in `.env` / `worker/.dev.vars`). Typical during development: re-seed demo users, or re-apply schema after editing `supabase/schema/*.sql`.

**Do not delete** the Supabase project, Cloudflare Worker/Pages, or your env files unless you intend a full greenfield setup.

### When to use which level

| Goal | Reset level | Redeploy app? |
|------|-------------|---------------|
| App already deployed; schema unchanged; only need demo users again | **Level A** (data only) | No — run `npm run db:seed` only |
| App deployed with `deploy:all:skip-db`; schema already applied; testing login | **None** | No — open stable Pages URL (see [deploy-guide](./deploy-guide.md)) |
| Changed files under `supabase/schema/` | **Level B** (full `public` wipe) | Optional — `npm run deploy:all:skip-db` if only DB changed |
| First-time schema on empty project | **None** | `npm run db:schema` then `npm run deploy:all` |

After a successful `npm run deploy:all:skip-db`, you usually **do not** need to wipe tables — verify the app at the **stable** Pages URL from the deploy summary (not the Wrangler preview hash URL).

### What to keep (always)

- Supabase **project** (dashboard project, ref in `SUPABASE_URL`)
- **Project Settings → API** keys (already in `.env` and `worker/.dev.vars`)
- Auth provider settings you configured once (e.g. [email confirmation off for demo](#4-email-confirmation-disabled-demo-only))
- Cloudflare deploy (Worker + Pages) — unrelated to DB reset

### Level A — Data only (re-run `db:seed`)

**Keeps:** all tables, enums, functions, triggers, RLS policies, and Realtime publication from `db:schema`.

**Clear:**

1. **Authentication → Users** — delete **all** users (Dashboard). Required so `db:seed` can create demo accounts.
2. **`public` table data** — all rows in the CRM tables below.

Tables (from `supabase/schema/02_tables.sql`):

- `deal_notes`
- `deal_stage_history`
- `deals`
- `conversation_messages`
- `conversation_threads`
- `clients`
- `profiles`

**Dashboard → SQL Editor** — run:

```sql
-- WARNING: deletes all CRM rows. Keeps schema (tables, RLS, triggers).
-- Delete Auth users in the Dashboard first (Authentication → Users).

TRUNCATE TABLE
  public.deal_notes,
  public.deal_stage_history,
  public.deals,
  public.conversation_messages,
  public.conversation_threads,
  public.clients,
  public.profiles
CASCADE;
```

**Then:**

```bash
npm run db:seed
npm run verify:stack:supabase   # optional check
```

Redeploy only if you also changed Worker/Pages code: `npm run deploy:all:skip-db`.

### Level B — Full schema reset (re-run `db:schema` + optional `db:seed`)

**Keeps:** the Supabase project and API keys (see [What to keep](#what-to-keep-always)).

**Clears:** everything `npm run db:schema` would create — tables, enums (`app_role`, `deal_stage`, …), functions (`handle_new_user`, `current_app_role`, …), trigger on `auth.users`, RLS policies, Realtime publication (`supabase/schema/01` … `05`).

**Steps:**

1. **Authentication → Users** — delete **all** users (hosted Supabase does not expose a simple “delete all users” SQL path for most roles).
2. **SQL Editor** — run:

```sql
-- WARNING: destroys ALL objects in the public schema (tables, types, functions, policies).
-- Does NOT delete the Supabase project. Run only on a throwaway / dev project.

DROP SCHEMA public CASCADE;

CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO anon;
GRANT ALL ON SCHEMA public TO authenticated;
GRANT ALL ON SCHEMA public TO service_role;
```

3. Confirm **Authentication → Users** is empty.

**Then:**

```bash
npm run db:schema
npm run db:seed                    # optional demo users + CRM rows
npm run deploy:all:skip-db         # if app already deployed; use deploy:all on first full stack setup
npm run verify:stack:supabase
```

### Never do this on the linked dev project

- Delete the Supabase **project** in the dashboard (you would need new keys and URLs everywhere).
- Run `npm run db:schema` expecting it to truncate or replace data — it will **abort** if `profiles` exists.
- Use preview Pages URLs (`https://<hash>.<project-domains>`) for login tests after deploy — use the **stable** URL from `deploy:all` or `wrangler pages project list` ([deploy-guide](./deploy-guide.md#pages-url-stable-vs-deployment-preview-read-before-pass-2)).

---

### 4. Email confirmation disabled (demo only)

For the **demo environment** we **disable email confirmation** in Supabase Auth so you can:

- Log in immediately with seeded `@demo.local` users.
- Register extra fake clients during demos without inbox friction.

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
- `.env` and `worker/.dev.vars` filled per [Credentials](#credentials-what-to-get-where-to-paste) above.
- Supabase CLI installed: `npm run setup:local`.

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

## Manual fallback (no CLI password)

Paste `supabase/schema/01` … `05` in order in **Dashboard → SQL Editor**. Same SQL as `npm run db:schema`. You still need secret/publishable keys for seed and the app.

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
Follow [Reset database without deleting the project](#reset-database-without-deleting-the-project) — Level B.

**`db:seed` — database is not empty**  
Follow [Reset database without deleting the project](#reset-database-without-deleting-the-project) — Level A.

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
  db-apply-schema.mjs      # wraps: supabase db query -f ...
  db-seed.mjs              # Auth Admin API + REST (secret key)
  lib/load-stack-env.mjs
  lib/supabase-cli.mjs
  lib/supabase-db-check.mjs
  lib/resolve-db-url.mjs   # SUPABASE_DB_URL from dashboard only (no hardcoded host)
```
