-- Auto-create profiles row when a new auth user registers (default role: client).
-- Seeded demo users pass role + full_name in user_metadata.

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
  meta_role := coalesce(new.raw_user_meta_data ->> 'role', 'client');
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

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
