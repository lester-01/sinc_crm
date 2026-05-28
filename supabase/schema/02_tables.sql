-- Phase 5: core tables per project_requirements/database.md

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null,
  created_at timestamptz not null default now()
);

create table if not exists clients (
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

create table if not exists conversation_threads (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  assigned_to uuid references profiles(id),
  subject text not null,
  status conversation_status not null default 'open',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references conversation_threads(id) on delete cascade,
  sender_id uuid not null references profiles(id),
  sender_type message_sender_type not null,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists deals (
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

create table if not exists deal_stage_history (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  from_stage deal_stage,
  to_stage deal_stage not null,
  changed_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references deals(id) on delete cascade,
  author_id uuid not null references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);
