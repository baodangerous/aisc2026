create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  reporter_uid uuid references auth.users(id) on delete set null,
  region_cell text,
  severity text not null default 'unknown' check (severity in ('critical','emergency','urgent','non_urgent','unknown')),
  status text not null default 'reported' check (status in ('reported','triaged','dispatching','responder_assigned','resolved','cancelled')),
  consent_to_analytics boolean not null default false,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.incident_timeline_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  event_type text not null check (event_type in ('detected','recognized','called_115','first_action','responder_arrived','medical_access','resolved')),
  occurred_at timestamptz not null,
  actor_uid uuid references auth.users(id) on delete set null,
  region_cell text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.aed_locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  availability_status text not null default 'unknown' check (availability_status in ('available','unavailable','unknown')),
  source text not null default 'unverified',
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists incidents_org_time_idx on public.incidents(organization_id, occurred_at desc);
create index if not exists incidents_region_time_idx on public.incidents(region_cell, occurred_at desc);
create index if not exists incident_events_incident_time_idx on public.incident_timeline_events(incident_id, occurred_at);
create index if not exists aed_locations_geo_idx on public.aed_locations(latitude, longitude);

alter table public.incidents enable row level security;
alter table public.incident_timeline_events enable row level security;
alter table public.aed_locations enable row level security;

create policy incidents_insert_authenticated on public.incidents for insert to authenticated with check (reporter_uid = (select auth.uid()));
create policy incidents_select_owner_or_org_admin on public.incidents for select to authenticated using (reporter_uid = (select auth.uid()) or exists (select 1 from public.organization_members member where member.organization_id = incidents.organization_id and member.user_id = (select auth.uid()) and member.role in ('owner','admin','analyst')));
create policy incident_events_owner_or_org_admin on public.incident_timeline_events for select to authenticated using (exists (select 1 from public.incidents incident where incident.id = incident_timeline_events.incident_id and (incident.reporter_uid = (select auth.uid()) or exists (select 1 from public.organization_members member where member.organization_id = incident.organization_id and member.user_id = (select auth.uid()) and member.role in ('owner','admin','analyst')))));
create policy aed_locations_public_read on public.aed_locations for select to anon, authenticated using (true);

grant select on public.aed_locations to anon, authenticated;
grant select, insert on public.incidents to authenticated;
grant select on public.incident_timeline_events to authenticated;
