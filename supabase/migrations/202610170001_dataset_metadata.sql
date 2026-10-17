-- Relational metadata for risk, scenario, provenance, review, and versioning.
create table if not exists public.ai_dataset_versions (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  description text not null default '',
  source_name text not null,
  source_uri text,
  checksum text,
  total_examples integer not null default 0 check (total_examples >= 0),
  train_examples integer not null default 0 check (train_examples >= 0),
  validation_examples integer not null default 0 check (validation_examples >= 0),
  test_examples integer not null default 0 check (test_examples >= 0),
  status text not null default 'draft' check (status in ('draft', 'review', 'approved', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_risk_labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('critical', 'emergency', 'urgent', 'non_urgent', 'unknown')),
  label text not null,
  description text not null default '',
  sort_order integer not null default 0,
  requires_115 boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_scenario_labels (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ai_training_example_metadata (
  example_id uuid primary key references public.ai_training_examples(id) on delete cascade,
  dataset_version_id uuid references public.ai_dataset_versions(id) on delete set null,
  risk_label_id uuid references public.ai_risk_labels(id) on delete set null,
  scenario_label_id uuid references public.ai_scenario_labels(id) on delete set null,
  source_document_id uuid references public.knowledge_documents(id) on delete set null,
  reviewer_id uuid references auth.users(id) on delete set null,
  review_status text not null default 'pending' check (review_status in ('pending', 'in_review', 'approved', 'rejected')),
  reviewer_notes text not null default '',
  confidence numeric check (confidence is null or confidence between 0 and 1),
  is_duplicate boolean not null default false,
  duplicate_of uuid references public.ai_training_examples(id) on delete set null,
  pii_checked boolean not null default false,
  safety_checked boolean not null default false,
  tags text[] not null default '{}',
  symptoms jsonb not null default '[]'::jsonb,
  emergency_signs jsonb not null default '[]'::jsonb,
  recommended_action text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_example_metadata_risk_idx on public.ai_training_example_metadata(risk_label_id);
create index if not exists ai_example_metadata_review_idx on public.ai_training_example_metadata(review_status);
create index if not exists ai_example_metadata_version_idx on public.ai_training_example_metadata(dataset_version_id);
create index if not exists ai_example_metadata_tags_gin on public.ai_training_example_metadata using gin(tags);

insert into public.ai_risk_labels (code, label, description, sort_order, requires_115) values
  ('critical', 'Nguy kịch', 'Nguy cơ tử vong hoặc tổn thương nặng tức thì.', 1, true),
  ('emergency', 'Khẩn cấp', 'Cần gọi 115 hoặc hỗ trợ y tế khẩn cấp.', 2, true),
  ('urgent', 'Ưu tiên', 'Cần đánh giá y tế sớm, không nên trì hoãn.', 3, false),
  ('non_urgent', 'Không khẩn cấp', 'Có thể theo dõi và xử lý sơ cứu cơ bản.', 4, false),
  ('unknown', 'Chưa phân loại', 'Cần chuyên gia rà soát trước khi sử dụng.', 5, false)
on conflict (code) do update set label = excluded.label, description = excluded.description, sort_order = excluded.sort_order, requires_115 = excluded.requires_115;

alter table public.ai_dataset_versions enable row level security;
alter table public.ai_risk_labels enable row level security;
alter table public.ai_scenario_labels enable row level security;
alter table public.ai_training_example_metadata enable row level security;

drop policy if exists ai_risk_labels_read on public.ai_risk_labels;
create policy ai_risk_labels_read on public.ai_risk_labels for select to anon, authenticated using (true);
drop policy if exists ai_scenario_labels_read on public.ai_scenario_labels;
create policy ai_scenario_labels_read on public.ai_scenario_labels for select to anon, authenticated using (true);
drop policy if exists ai_metadata_read on public.ai_training_example_metadata;
create policy ai_metadata_read on public.ai_training_example_metadata for select to authenticated using (review_status = 'approved');
drop policy if exists ai_versions_read on public.ai_dataset_versions;
create policy ai_versions_read on public.ai_dataset_versions for select to authenticated using (status = 'approved');

grant select on public.ai_risk_labels, public.ai_scenario_labels to anon, authenticated;
grant select on public.ai_dataset_versions, public.ai_training_example_metadata to authenticated;
