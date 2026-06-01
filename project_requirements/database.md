# Database

Use Supabase Postgres.

## Types

```sql
create type app_role as enum ('client', 'sales', 'manager');
create type conversation_status as enum ('open', 'pending', 'closed');
create type message_sender_type as enum ('client', 'team');
create type deal_stage as enum (
  'new_lead',
  'contacted',
  'consultation_booked',
  'documents_requested',
  'application_started',
  'submitted',
  'won',
  'lost'
);
```

## Tables

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null,
  created_at timestamptz not null default now()
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles(id),
  full_name text not null,
  email text not null,
  phone text,
  country text,
  target_country text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_email_unique unique (email)
);

create table conversation_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  assigned_to uuid references profiles(id),
  subject text not null,
  status conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table conversation_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references conversation_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  sender_type message_sender_type not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table deals (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  owner_id uuid references profiles(id),
  title text not null,
  stage deal_stage not null default 'new_lead',
  value_amount numeric(12, 2),
  value_currency text default 'USD',
  expected_intake text,
  lost_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  from_stage deal_stage,
  to_stage deal_stage not null,
  changed_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
```

## Suggested Indexes

```sql
create index clients_email_idx on clients(email);
create index clients_profile_id_idx on clients(profile_id);

create index conversation_threads_client_id_idx on conversation_threads(client_id);
create index conversation_threads_assigned_to_idx on conversation_threads(assigned_to);
create index conversation_threads_status_idx on conversation_threads(status);
create index conversation_threads_last_message_at_idx on conversation_threads(last_message_at desc);
create index conversation_messages_thread_id_created_at_idx on conversation_messages(thread_id, created_at);

create index deals_client_id_idx on deals(client_id);
create index deals_owner_id_idx on deals(owner_id);
create index deals_stage_idx on deals(stage);
create index deal_stage_history_deal_id_created_at_idx on deal_stage_history(deal_id, created_at desc);
create index deal_notes_deal_id_created_at_idx on deal_notes(deal_id, created_at desc);
```

## Phase 5 additions (implemented in `supabase/schema/`)

| Addition | Why |
|----------|-----|
| `clients.email` **UNIQUE** | One CRM row per email; prevents duplicate client records. |
| `conversation_threads_last_message_at_idx` | Sort inbox/queue by recent activity. |
| `handle_new_user` trigger | Inserts `profiles` on `auth.users` signup; role from **app_metadata** (default `client`). |
| **RLS** `SELECT` policies + **private** helpers | Browser Realtime uses publishable key + JWT; helpers not exposed as RPC. |
| **RLS auto-enable** (`00`) | New `public` tables get RLS via event trigger. |
| **Realtime publication** | `conversation_messages`, `conversation_threads`, `deals`, `deal_stage_history`, `deal_notes` added to `supabase_realtime`. |

Canonical SQL lives in `supabase/schema/*.sql`. Apply with `npm run db:schema` (see [docs/database-setup.md](../docs/database-setup.md)).

## Access Rules

- Client can only read their own client record, conversations, messages, and high-level deal status.
- Sales can read assigned conversations and deals, plus unassigned conversations.
- Sales can create deals.
- Sales can update only owned deals.
- Manager can read and update all clients, conversations, and deals.

**Enforcement:** Hono Worker uses `SUPABASE_SECRET_KEY` and enforces writes/authorization. RLS backs **read** paths (especially Realtime). Do not expose the secret key to the browser.
