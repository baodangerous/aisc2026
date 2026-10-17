-- ============================================================================
-- MIGRATION: 202610170003_dataset_v1_and_knowledge_governance.sql
-- Description: Extends knowledge_documents governance fields and inserts
--              dataset versions metadata (v0-legacy-demo & v1.0.0).
-- ============================================================================

-- 1. Extend knowledge_documents with clinical governance & provenance columns
alter table public.knowledge_documents add column if not exists version text not null default '1.0';
alter table public.knowledge_documents add column if not exists reviewer_id uuid references auth.users(id) on delete set null;
alter table public.knowledge_documents add column if not exists reviewed_at timestamptz;
alter table public.knowledge_documents add column if not exists expires_at timestamptz;
alter table public.knowledge_documents add column if not exists checksum text;

create index if not exists knowledge_documents_reviewer_idx on public.knowledge_documents(reviewer_id, reviewed_at);
create index if not exists knowledge_documents_version_idx on public.knowledge_documents(version);

-- 2. Register v0-legacy-demo (archived) and v1.0.0 (review/active)
insert into public.ai_dataset_versions (
  version,
  description,
  source_name,
  source_uri,
  checksum,
  total_examples,
  train_examples,
  validation_examples,
  test_examples,
  status
) values (
  'v0-legacy-demo',
  'Bộ dữ liệu demo ban đầu 500 mẫu tạo từ 5 seed lặp lại. Đã lưu trữ để truy vết, không dùng đánh giá.',
  'synthetic_expansion_demo',
  'data/goldenminutes_demo_500.jsonl',
  'legacy-sha256-unverified',
  500,
  400,
  50,
  50,
  'archived'
) on conflict (version) do update set
  status = 'archived',
  description = excluded.description;

insert into public.ai_dataset_versions (
  version,
  description,
  source_name,
  source_uri,
  checksum,
  total_examples,
  train_examples,
  validation_examples,
  test_examples,
  status
) values (
  'v1.0.0',
  'Tập dữ liệu chuẩn hóa 222 mẫu duy nhất không rò rỉ, phân tầng theo 26 nhóm tình huống thực địa và 52 mẫu holdout.',
  'goldenminutes_curated_v1',
  'data/v1/goldenminutes_v1_all.jsonl',
  '7bb28eaa4cb902dfe355d9a21c29a7236633b232a726e2fdd32878476b16cd1d',
  222,
  152,
  35,
  35,
  'review'
) on conflict (version) do update set
  total_examples = excluded.total_examples,
  train_examples = excluded.train_examples,
  validation_examples = excluded.validation_examples,
  test_examples = excluded.test_examples,
  checksum = excluded.checksum,
  status = excluded.status;
