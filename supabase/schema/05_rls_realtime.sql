-- RLS for browser Realtime + defense in depth. Worker writes use SUPABASE_SECRET_KEY (bypasses RLS).

-- Helper: current user's app role
create or replace function public.current_app_role()
returns app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- Helper: CRM client row for logged-in client user
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.clients where profile_id = auth.uid() limit 1
$$;

-- Helper: sales/manager can see thread in queue or assignment
create or replace function public.can_access_thread(t public.conversation_threads)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_app_role()
    when 'manager' then true
    when 'sales' then t.assigned_to is null or t.assigned_to = auth.uid()
    when 'client' then t.client_id = public.current_client_id()
    else false
  end
$$;

create or replace function public.can_access_deal(d public.deals)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case public.current_app_role()
    when 'manager' then true
    when 'sales' then true
    when 'client' then d.client_id = public.current_client_id()
    else false
  end
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.conversation_threads enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.deals enable row level security;
alter table public.deal_stage_history enable row level security;
alter table public.deal_notes enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.current_app_role() = 'manager');

-- clients
drop policy if exists clients_select_scoped on public.clients;
create policy clients_select_scoped on public.clients
  for select to authenticated
  using (
    public.current_app_role() in ('sales', 'manager')
    or profile_id = auth.uid()
  );

-- conversation_threads
drop policy if exists conversation_threads_select_scoped on public.conversation_threads;
create policy conversation_threads_select_scoped on public.conversation_threads
  for select to authenticated
  using (public.can_access_thread(conversation_threads));

-- conversation_messages
drop policy if exists conversation_messages_select_scoped on public.conversation_messages;
create policy conversation_messages_select_scoped on public.conversation_messages
  for select to authenticated
  using (
    exists (
      select 1 from public.conversation_threads t
      where t.id = conversation_messages.thread_id
        and public.can_access_thread(t)
    )
  );

-- deals
drop policy if exists deals_select_scoped on public.deals;
create policy deals_select_scoped on public.deals
  for select to authenticated
  using (public.can_access_deal(deals));

-- deal_stage_history
drop policy if exists deal_stage_history_select_scoped on public.deal_stage_history;
create policy deal_stage_history_select_scoped on public.deal_stage_history
  for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_stage_history.deal_id
        and public.can_access_deal(d)
    )
  );

-- deal_notes
drop policy if exists deal_notes_select_scoped on public.deal_notes;
create policy deal_notes_select_scoped on public.deal_notes
  for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_notes.deal_id
        and public.can_access_deal(d)
    )
  );

-- Realtime: add tables to supabase_realtime publication (idempotent-ish)
do $$
begin
  alter publication supabase_realtime add table public.conversation_messages;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.conversation_threads;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.deals;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.deal_stage_history;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.deal_notes;
exception when duplicate_object then null;
end $$;
