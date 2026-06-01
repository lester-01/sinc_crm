-- Auto-create profiles row when a new auth user registers (default role: client).
-- Role comes from app_metadata only (Admin API / seed). Public signUp cannot forge app_metadata.
-- Display name comes from user_metadata.full_name (user-editable; not used for authorization).
-- Client-role signups also link an existing CRM prospect by email or insert a clients row.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta_role text;
  meta_name text;
begin
  meta_role := coalesce(new.raw_app_meta_data ->> 'role', 'client');
  meta_name := coalesce(
    new.raw_user_meta_data ->> 'full_name',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );

  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    meta_name,
    meta_role::app_role
  )
  on conflict (id) do nothing;

  if meta_role = 'client' and new.email is not null then
    update public.clients
    set
      profile_id = new.id,
      full_name = coalesce(nullif(trim(meta_name), ''), full_name),
      updated_at = now()
    where lower(email) = lower(new.email)
      and profile_id is null;

    if not found then
      insert into public.clients (profile_id, full_name, email)
      values (new.id, meta_name, lower(new.email))
      on conflict (email) do update
      set
        profile_id = excluded.profile_id,
        full_name = excluded.full_name,
        updated_at = now()
      where public.clients.profile_id is null;
    end if;
  end if;

  return new;
end;
$$;

-- Trigger-only: block direct RPC calls via PostgREST.
revoke all on function public.handle_new_user() from public;
revoke all on function public.handle_new_user() from anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
