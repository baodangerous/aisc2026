-- GoldenMinutes core data model for Supabase Auth and user-owned training data.
-- Apply through Supabase SQL Editor or `supabase db push`.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Người dùng',
  role text not null default 'user' check (role in ('user', 'citizen', 'volunteer', 'platform_admin')),
  preferred_language text not null default 'vi' check (preferred_language in ('vi', 'en')),
  onboarding_completed boolean not null default false,
  deletion_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_sessions (
  session_id text primary key,
  owner_uid uuid not null references auth.users(id) on delete cascade,
  scenario_id text not null,
  scenario_version_id text not null default 'v1',
  scenario_title text,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  events jsonb not null default '[]'::jsonb,
  metrics jsonb not null default '{}'::jsonb,
  confidence_before numeric,
  confidence_after numeric,
  confidence_delta numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists training_sessions_owner_uid_idx on public.training_sessions(owner_uid);
create index if not exists training_sessions_updated_at_idx on public.training_sessions(updated_at desc);

create table if not exists public.deletion_requests (
  id uuid primary key references auth.users(id) on delete cascade,
  uid uuid not null references auth.users(id) on delete cascade,
  reason text,
  requested_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'completed'))
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, new.phone, 'Người dùng'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.training_sessions enable row level security;
alter table public.deletion_requests enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "training_sessions_select_own" on public.training_sessions;
create policy "training_sessions_select_own" on public.training_sessions for select to authenticated using ((select auth.uid()) = owner_uid);
drop policy if exists "training_sessions_insert_own" on public.training_sessions;
create policy "training_sessions_insert_own" on public.training_sessions for insert to authenticated with check ((select auth.uid()) = owner_uid);
drop policy if exists "training_sessions_update_own" on public.training_sessions;
create policy "training_sessions_update_own" on public.training_sessions for update to authenticated using ((select auth.uid()) = owner_uid) with check ((select auth.uid()) = owner_uid);
drop policy if exists "training_sessions_delete_own" on public.training_sessions;
create policy "training_sessions_delete_own" on public.training_sessions for delete to authenticated using ((select auth.uid()) = owner_uid);

drop policy if exists "deletion_requests_select_own" on public.deletion_requests;
create policy "deletion_requests_select_own" on public.deletion_requests for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "deletion_requests_insert_own" on public.deletion_requests;
create policy "deletion_requests_insert_own" on public.deletion_requests for insert to authenticated with check ((select auth.uid()) = id and (select auth.uid()) = uid);
drop policy if exists "deletion_requests_update_own" on public.deletion_requests;
create policy "deletion_requests_update_own" on public.deletion_requests for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and (select auth.uid()) = uid);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.training_sessions to authenticated;
grant select, insert, update on public.deletion_requests to authenticated;

insert into public.profiles (id, display_name)
select id, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name', split_part(coalesce(email, phone, 'Người dùng'), '@', 1))
from auth.users
on conflict (id) do nothing;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists training_sessions_set_updated_at on public.training_sessions;
create trigger training_sessions_set_updated_at before update on public.training_sessions for each row execute procedure public.set_updated_at();
