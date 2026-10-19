create table if not exists public.organization_training_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 3 and 160),
  description text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  venue text not null default '',
  delivery_mode text not null default 'onsite' check (delivery_mode in ('onsite', 'online', 'hybrid')),
  meeting_url text,
  capacity integer check (capacity is null or capacity between 1 and 10000),
  status text not null default 'published' check (status in ('published', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint training_event_time_order check (ends_at > starts_at),
  constraint training_event_meeting_url_http check (meeting_url is null or meeting_url ~* '^https?://')
);

create index if not exists organization_training_events_org_start_idx
  on public.organization_training_events (organization_id, starts_at)
  where status = 'published';

alter table public.organization_training_events enable row level security;

drop policy if exists org_training_events_member_read on public.organization_training_events;
create policy org_training_events_member_read on public.organization_training_events
  for select to authenticated using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = organization_training_events.organization_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy if exists org_training_events_manager_insert on public.organization_training_events;
create policy org_training_events_manager_insert on public.organization_training_events
  for insert to authenticated with check (
    created_by = (select auth.uid()) and exists (
      select 1 from public.organization_members member
      where member.organization_id = organization_training_events.organization_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'site_manager')
    )
  );

drop policy if exists org_training_events_manager_update on public.organization_training_events;
create policy org_training_events_manager_update on public.organization_training_events
  for update to authenticated using (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = organization_training_events.organization_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'site_manager')
    )
  ) with check (
    exists (
      select 1 from public.organization_members member
      where member.organization_id = organization_training_events.organization_id
        and member.user_id = (select auth.uid())
        and member.role in ('owner', 'admin', 'site_manager')
    )
  );

grant select, insert, update on public.organization_training_events to authenticated;

create table if not exists public.organization_training_event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.organization_training_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists organization_training_event_attendees_event_idx
  on public.organization_training_event_attendees (event_id);

alter table public.organization_training_event_attendees enable row level security;

drop policy if exists org_training_attendees_member_read on public.organization_training_event_attendees;
create policy org_training_attendees_member_read on public.organization_training_event_attendees
  for select to authenticated using (
    exists (
      select 1 from public.organization_training_events training_event
      join public.organization_members member on member.organization_id = training_event.organization_id
      where training_event.id = organization_training_event_attendees.event_id
        and member.user_id = (select auth.uid())
    )
  );

drop policy if exists org_training_attendees_self_delete on public.organization_training_event_attendees;
create policy org_training_attendees_self_delete on public.organization_training_event_attendees
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, delete on public.organization_training_event_attendees to authenticated;

create or replace function public.register_for_training_event(p_event_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_event public.organization_training_events%rowtype;
  attendee_count integer;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_event
  from public.organization_training_events
  where id = p_event_id and status = 'published' and starts_at > now()
  for update;
  if not found then raise exception 'EVENT_UNAVAILABLE'; end if;

  if not exists (
    select 1 from public.organization_members
    where organization_id = target_event.organization_id and user_id = auth.uid()
  ) then raise exception 'NOT_ORGANIZATION_MEMBER'; end if;

  select count(*)::integer into attendee_count
  from public.organization_training_event_attendees
  where event_id = p_event_id;

  if not exists (
    select 1 from public.organization_training_event_attendees
    where event_id = p_event_id and user_id = auth.uid()
  ) then
    if target_event.capacity is not null and attendee_count >= target_event.capacity then
      raise exception 'EVENT_FULL';
    end if;
    insert into public.organization_training_event_attendees (event_id, user_id)
    values (p_event_id, auth.uid()) on conflict (event_id, user_id) do nothing;
    attendee_count := attendee_count + 1;
  end if;
  return attendee_count;
end;
$$;

revoke all on function public.register_for_training_event(uuid) from public;
grant execute on function public.register_for_training_event(uuid) to authenticated;
