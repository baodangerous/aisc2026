-- Allow the auth.users signup trigger to create a profile while profiles RLS is enabled.
-- Apply as the database owner (Supabase CLI or SQL Editor).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(split_part(coalesce(new.email, new.phone, 'Người dùng'), '@', 1), ''),
      'Người dùng'
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- Ensure the auth trigger uses the corrected function, including on projects
-- where the trigger was removed or changed manually.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Trigger execution does not require exposing this function through the API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
