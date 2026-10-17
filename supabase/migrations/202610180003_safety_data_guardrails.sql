alter table public.aed_locations add column if not exists verification_status text not null default 'unverified' check (verification_status in ('verified','unverified','rejected'));
alter table public.aed_locations add column if not exists origin text not null default 'synthetic_seed' check (origin in ('training_user','synthetic_seed','pilot_verified'));

create index if not exists aed_locations_verified_idx on public.aed_locations(verification_status, origin);

drop policy if exists aed_locations_public_read on public.aed_locations;
create policy aed_locations_public_read on public.aed_locations
  for select to anon, authenticated
  using (verification_status = 'verified' and origin <> 'synthetic_seed');

grant select on public.aed_locations to anon, authenticated;

alter table public.incidents add column if not exists device_hash text;
alter table public.incidents add column if not exists origin text not null default 'synthetic_seed' check (origin in ('training_user','synthetic_seed','pilot_verified'));

create index if not exists incidents_org_origin_idx on public.incidents(organization_id, origin, occurred_at desc);
