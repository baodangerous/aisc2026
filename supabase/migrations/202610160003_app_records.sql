create table if not exists public.app_records (
  collection text not null,
  record_id text not null,
  owner_uid uuid,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (collection, record_id)
);
create index if not exists app_records_owner_idx on public.app_records(owner_uid);
create index if not exists app_records_collection_idx on public.app_records(collection);
alter table public.app_records enable row level security;
revoke all on public.app_records from anon, authenticated;
create or replace function public.set_app_record_updated_at() returns trigger language plpgsql set search_path = public as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists app_records_updated_at on public.app_records;
create trigger app_records_updated_at before update on public.app_records for each row execute procedure public.set_app_record_updated_at();
