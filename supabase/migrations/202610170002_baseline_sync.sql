-- ============================================================================
-- BASELINE SYNC MIGRATION: 202610170002_baseline_sync.sql
-- Status: UNVERIFIED BASELINE SYNC (Generated to align repo schema with live DB)
-- 
-- If direct database credentials become available, run the following command
-- to verify against live Supabase instance:
--   supabase db dump --schema public > supabase/migrations/202610170002_live_dump.sql
-- ============================================================================

-- 1. Organizations & Tenancy
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text default '',
  logo_url text,
  plan text default 'free' check (plan in ('free', 'starter', 'pro', 'enterprise')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'analyst', 'site_manager', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table if not exists public.organization_invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner', 'admin', 'analyst', 'site_manager', 'viewer')),
  invited_by uuid references auth.users(id) on delete set null,
  token text unique default encode(gen_random_bytes(24), 'hex'),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days')
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  code text,
  address text default '',
  lat double precision,
  lng double precision,
  contact_name text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_subscriptions (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  tier text not null default 'standard',
  status text not null default 'active' check (status in ('active', 'past_due', 'canceled')),
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.data_partnerships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  partner_name text not null,
  status text not null default 'active' check (status in ('pending', 'active', 'suspended', 'terminated')),
  agreement_type text not null default 'mou',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 2. Medical Facilities & Compatibility View
create table if not exists public.medical_facilities (
  id text primary key,
  name text not null,
  type text not null default 'hospital' check (type in ('hospital', 'clinic', 'emergency_station', 'health_center')),
  address text not null default '',
  province text not null default 'TP. Hồ Chí Minh',
  district text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  region_cell text,
  is_public_access boolean not null default true,
  operating_hours text not null default '24/7',
  status text not null default 'verified' check (status in ('verified', 'unverified', 'reported')),
  disclaimer text not null default 'Dữ liệu y tế xác thực phục vụ điều hướng sơ cứu.',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists medical_facilities_geo_idx on public.medical_facilities(lat, lng);
create index if not exists medical_facilities_region_idx on public.medical_facilities(region_cell);

-- Compatibility view for legacy facilities references
create or replace view public.facilities_compat as
select
  id,
  name,
  type,
  address,
  province,
  district,
  lat,
  lng,
  region_cell as "regionCell",
  is_public_access as "isPublicAccess",
  operating_hours as "operatingHours",
  status,
  disclaimer
from public.medical_facilities;

-- 3. Audit Logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  previous_state jsonb,
  new_state jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_idx on public.audit_logs(actor_id);
create index if not exists audit_logs_action_idx on public.audit_logs(action, entity_type);
create index if not exists audit_logs_time_idx on public.audit_logs(created_at desc);

-- 4. Aggregates Store
create table if not exists public.aggregates (
  id text primary key,
  scenario_id text,
  period text not null default 'daily',
  session_count integer not null default 0,
  completion_count integer not null default 0,
  median_adi_sec numeric,
  mro_count integer not null default 0,
  avg_readiness_score numeric,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5. Forum Community Tables
create table if not exists public.forum_topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text unique,
  author_id uuid references auth.users(id) on delete set null,
  is_pinned boolean not null default false,
  is_locked boolean not null default false,
  post_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.forum_topics(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  content text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'flagged')),
  upvotes integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  author_id uuid references auth.users(id) on delete set null,
  content text not null,
  status text not null default 'published' check (status in ('published', 'hidden', 'flagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.forum_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references auth.users(id) on delete set null,
  target_type text not null check (target_type in ('post', 'comment', 'user')),
  target_id text not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction_type text not null default 'like' check (reaction_type in ('like', 'helpful', 'heart')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id, reaction_type)
);

-- Legacy notice
comment on table public.app_records is 'LEGACY JSON-store for document-like entities; deprecated for new relational feature models.';

-- Row Level Security
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.organization_invitations enable row level security;
alter table public.sites enable row level security;
alter table public.site_subscriptions enable row level security;
alter table public.data_partnerships enable row level security;
alter table public.medical_facilities enable row level security;
alter table public.audit_logs enable row level security;
alter table public.aggregates enable row level security;
alter table public.forum_topics enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_comments enable row level security;
alter table public.forum_reports enable row level security;
alter table public.post_reactions enable row level security;

-- Policies
create policy medical_facilities_public_read on public.medical_facilities for select to anon, authenticated using (true);
create policy aggregates_public_read on public.aggregates for select to anon, authenticated using (true);
create policy forum_topics_public_read on public.forum_topics for select to anon, authenticated using (true);
create policy forum_posts_public_read on public.forum_posts for select to anon, authenticated using (status = 'published');
create policy forum_comments_public_read on public.forum_comments for select to anon, authenticated using (status = 'published');

grant select on public.medical_facilities to anon, authenticated;
grant select on public.aggregates to anon, authenticated;
grant select on public.forum_topics, public.forum_posts, public.forum_comments to anon, authenticated;
