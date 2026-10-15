-- Data-driven ingestion, provenance, analytics, and retrieval-ready knowledge.
create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  title text not null,
  topic text not null,
  language text not null default 'vi' check (language in ('vi', 'en')),
  source_name text not null,
  source_url text not null,
  source_published_at date,
  content text not null,
  content_hash text not null,
  chunk_index integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists knowledge_documents_topic_idx on public.knowledge_documents(topic);
create index if not exists knowledge_documents_status_idx on public.knowledge_documents(status);

create table if not exists public.ai_training_examples (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  task text not null check (task in ('retrieval_qa', 'fact_extraction', 'classification')),
  input text not null,
  expected_output jsonb not null,
  source_document_id uuid references public.knowledge_documents(id) on delete set null,
  quality_label text not null default 'reviewed' check (quality_label in ('synthetic', 'reviewed', 'pilot_verified')),
  split text not null default 'train' check (split in ('train', 'validation', 'test')),
  created_at timestamptz not null default now()
);

create table if not exists public.data_quality_runs (
  id uuid primary key default gen_random_uuid(),
  pipeline_version text not null,
  source_name text not null,
  input_rows integer not null default 0,
  accepted_rows integer not null default 0,
  rejected_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  pii_redactions integer not null default 0,
  metrics jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.training_analytics_daily (
  day date primary key,
  sessions integer not null default 0,
  completed_sessions integer not null default 0,
  completion_rate numeric not null default 0,
  median_confidence_delta numeric,
  scenario_breakdown jsonb not null default '{}'::jsonb,
  source text not null default 'user_training'
);

alter table public.knowledge_documents enable row level security;
alter table public.ai_training_examples enable row level security;
alter table public.data_quality_runs enable row level security;
alter table public.training_analytics_daily enable row level security;

drop policy if exists "approved_knowledge_public_read" on public.knowledge_documents;
create policy "approved_knowledge_public_read" on public.knowledge_documents for select to anon, authenticated using (status = 'approved');
drop policy if exists "approved_examples_authenticated_read" on public.ai_training_examples;
create policy "approved_examples_authenticated_read" on public.ai_training_examples for select to authenticated using (quality_label in ('reviewed', 'pilot_verified'));
drop policy if exists "analytics_authenticated_read" on public.training_analytics_daily;
create policy "analytics_authenticated_read" on public.training_analytics_daily for select to authenticated using (true);

grant select on public.knowledge_documents to anon, authenticated;
grant select on public.ai_training_examples, public.training_analytics_daily to authenticated;

create index if not exists ai_training_examples_task_split_idx on public.ai_training_examples(task, split);
create index if not exists data_quality_runs_created_at_idx on public.data_quality_runs(created_at desc);

create or replace function public.set_updated_at_knowledge_documents()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists knowledge_documents_set_updated_at on public.knowledge_documents;
create trigger knowledge_documents_set_updated_at before update on public.knowledge_documents for each row execute procedure public.set_updated_at_knowledge_documents();

-- Data API access is intentionally read-only for the client. Imports use the server service key.
revoke insert, update, delete on public.knowledge_documents from anon, authenticated;
revoke insert, update, delete on public.ai_training_examples from anon, authenticated;
revoke all on public.data_quality_runs from anon, authenticated;
