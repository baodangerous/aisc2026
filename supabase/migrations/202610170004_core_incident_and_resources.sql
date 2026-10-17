-- ============================================================================
-- MIGRATION: 202610170004_core_incident_and_resources.sql
-- Description: Core incident timeline model, verified emergency resources,
--              delay thresholds, regions, digital proofs, and analytics views.
-- ============================================================================

-- 1. Delay Thresholds (Single Source of Truth for ADI)
create table if not exists public.delay_thresholds (
  scenario_category text primary key,
  title_vi text not null,
  time_to_guidance_sec integer not null check (time_to_guidance_sec > 0),
  time_to_call_sec integer not null check (time_to_call_sec > 0),
  time_to_action_sec integer not null check (time_to_action_sec > 0),
  mro_threshold_sec integer not null check (mro_threshold_sec > 0),
  source_reference text not null,
  updated_at timestamptz not null default now()
);

insert into public.delay_thresholds (
  scenario_category, title_vi, time_to_guidance_sec, time_to_call_sec, time_to_action_sec, mro_threshold_sec, source_reference
) values
  ('cardiac_arrest', 'Ngừng tuần hoàn ngoại viện (OHCA)', 15, 45, 60, 25, 'AHA CPR & ECC 2020 / ERC 2021'),
  ('stroke', 'Đột quỵ não cấp (FAST)', 15, 30, 45, 20, 'AHA/ASA Stroke Guidelines 2020'),
  ('severe_bleeding', 'Chảy máu nghiêm trọng động mạch', 15, 40, 50, 20, 'ACS Stop the Bleed 2020'),
  ('choking', 'Hóc dị vật đường thở nguy kịch', 10, 30, 40, 20, 'ERC/AHA Choking Guidelines'),
  ('trauma_general', 'Chấn thương & sơ cứu thông thường', 20, 60, 90, 35, 'ACS ATLS Standard Protocols'),
  ('default', 'Ngưỡng mặc định chung', 15, 45, 60, 25, 'GoldenMinutes Baseline Standard')
on conflict (scenario_category) do update set
  time_to_guidance_sec = excluded.time_to_guidance_sec,
  time_to_call_sec = excluded.time_to_call_sec,
  time_to_action_sec = excluded.time_to_action_sec,
  mro_threshold_sec = excluded.mro_threshold_sec,
  source_reference = excluded.source_reference,
  updated_at = now();

-- 2. Metric Definitions (Provenance & Interpretability)
create table if not exists public.metric_definitions (
  key text primary key,
  name_vi text not null,
  formula_text text not null,
  numerator text,
  denominator text,
  exclusions text,
  limitation_text text not null,
  version text not null default '1.0',
  updated_at timestamptz not null default now()
);

insert into public.metric_definitions (
  key, name_vi, formula_text, numerator, denominator, exclusions, limitation_text, version
) values
  ('adi_sec', 'Chỉ số trễ có thể phòng tránh (ADI)', 'ADI = sum(max(0, actual_i - threshold_i)) cho i in [guidance, call_115, first_action]', 'Tổng giây vượt ngưỡng tại các mốc', 'Từng phiên sự cố', 'Các phiên bị hủy hoặc dưới 5 giây', 'Chỉ số đo lường độ trễ trong thao tác mô phỏng hoặc ghi nhận thực địa; không thay thế đánh giá lâm sàng độc lập.', '2.0'),
  ('mro_rate', 'Tỷ lệ nguy cơ bỏ lỡ thời gian vàng (MRO Rate)', 'Tỷ lệ phiên có ADI > ngưỡng MRO (mroThresholdSec)', 'Số phiên có ADI > mroThresholdSec * 100', 'Tổng số phiên hoàn thành', 'Phiên chưa hoàn tất', 'Cảnh báo nguy cơ thống kê, không phải kết luận về kết quả sống còn của ca bệnh thực tế.', '1.0'),
  ('time_to_guidance_sec', 'Thời gian mở hướng dẫn (TTG)', 'Thời điểm mở thẻ thao tác chuẩn - Thời điểm mở ứng dụng', 'Giây', '1 phiên', 'Không mở hướng dẫn', 'Đo lường thời gian định hướng của người sơ cứu.', '1.0'),
  ('time_to_call_sec', 'Thời gian bấm gọi 115 (TTC)', 'Thời điểm bấm gọi 115 - Thời điểm mở ứng dụng', 'Giây', '1 phiên', 'Không bấm gọi 115', 'Ghi nhận thao tác kích hoạt đường dây nóng cấp cứu trên thiết bị.', '1.0'),
  ('time_to_action_sec', 'Thời gian bắt đầu hành động đầu tiên (TTA)', 'Thời điểm bắt đầu ép tim / đè ép cầm máu - Thời điểm mở ứng dụng', 'Giây', '1 phiên', 'Không ghi nhận thao tác', 'Đo lường phản xạ thao tác cơ học ban đầu.', '1.0'),
  ('completion_rate', 'Tỷ lệ hoàn thành quy trình sơ cứu', 'Số phiên hoàn thành / Tổng số phiên * 100', 'Phiên completed', 'Tổng phiên', 'None', 'Phản ánh mức độ theo sát kịch bản huấn luyện của người dùng.', '1.0')
on conflict (key) do update set
  name_vi = excluded.name_vi,
  formula_text = excluded.formula_text,
  limitation_text = excluded.limitation_text,
  updated_at = now();

-- 3. Regions (Quận/Phường TP.HCM cho phân tích điểm nóng)
create table if not exists public.regions (
  region_id text primary key,
  name text not null,
  province text not null default 'TP. Hồ Chí Minh',
  district text not null,
  area_type text not null default 'mixed' check (area_type in ('residential', 'commercial', 'industrial', 'educational', 'mixed')),
  lat double precision not null,
  lng double precision not null,
  geohash6_list text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- Seed TP.HCM Regions (Phụ lục M mẫu)
insert into public.regions (region_id, name, district, area_type, lat, lng, geohash6_list) values
  ('Q1-P01', 'Phường Bến Nghé', 'Quận 1', 'commercial', 10.7769, 106.7009, '{w3gvhx,w3gvhy}'),
  ('Q1-P02', 'Phường Bến Thành', 'Quận 1', 'commercial', 10.7716, 106.6934, '{w3gvhq,w3gvhr}'),
  ('Q1-P03', 'Phường Đa Kao', 'Quận 1', 'mixed', 10.7877, 106.6983, '{w3gvjk,w3gvjm}'),
  ('Q3-P01', 'Phường Võ Thị Sáu', 'Quận 3', 'mixed', 10.7844, 106.6896, '{w3gvjh,w3gvjj}'),
  ('Q3-P05', 'Phường 5', 'Quận 3', 'residential', 10.7733, 106.6841, '{w3gvhj,w3gvhw}'),
  ('Q5-P02', 'Phường 2', 'Quận 5', 'commercial', 10.7562, 106.6711, '{w3gv5w,w3gv5y}'),
  ('Q5-P11', 'Phường 11', 'Quận 5', 'mixed', 10.7533, 106.6612, '{w3gv5t,w3gv5v}'),
  ('Q10-P01', 'Phường 14', 'Quận 10', 'educational', 10.7725, 106.6578, '{w3gvh5,w3gvh7}'),
  ('Q10-P02', 'Phường 12', 'Quận 10', 'commercial', 10.7788, 106.6672, '{w3gvh6,w3gvhk}'),
  ('QBT-P01', 'Phường 25', 'Quận Bình Thạnh', 'educational', 10.8033, 106.7155, '{w3gvmg,w3gvmv}'),
  ('QBT-P02', 'Phường 19', 'Quận Bình Thạnh', 'residential', 10.7912, 106.7088, '{w3gvjs,w3gvju}'),
  ('QTB-P02', 'Phường 2', 'Quận Tân Bình', 'commercial', 10.8062, 106.6664, '{w3gvkh,w3gvkj}'),
  ('QPN-P01', 'Phường 7', 'Quận Phú Nhuận', 'residential', 10.7981, 106.6872, '{w3gvk2,w3gvk3}'),
  ('Q7-P01', 'Phường Tân Phú', 'Quận 7', 'residential', 10.7324, 106.7211, '{w3gugx,w3gugz}'),
  ('Q7-P02', 'Phường Tân Hưng', 'Quận 7', 'mixed', 10.7488, 106.7022, '{w3gvgq,w3gvgr}'),
  ('QTD-P01', 'Phường Linh Trung', 'TP. Thủ Đức', 'educational', 10.8711, 106.7725, '{w3gvu9,w3gvud}'),
  ('QTD-P07', 'Phường Thảo Điền', 'TP. Thủ Đức', 'residential', 10.8044, 106.7366, '{w3gvmt,w3gvmw}')
on conflict (region_id) do update set
  name = excluded.name,
  area_type = excluded.area_type,
  lat = excluded.lat,
  lng = excluded.lng,
  geohash6_list = excluded.geohash6_list;

-- 4. Emergency Resources (Verified AED & Medical Equipment)
create table if not exists public.emergency_resources (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null default 'aed' check (resource_type in ('aed', 'first_aid_kit', 'emergency_cabinet', 'bleeding_control_kit')),
  name text not null,
  address text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  geohash7 text,
  site_id uuid references public.sites(id) on delete set null,
  managing_org_id uuid references public.organizations(id) on delete set null,
  source text not null default 'osm' check (source in ('osm', 'admin', 'org_submission', 'synthetic')),
  origin text not null default 'pilot_verified' check (origin in ('training_user', 'synthetic_seed', 'pilot_verified', 'osm_import')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'pending', 'verified', 'rejected', 'expired')),
  verified_at timestamptz,
  expires_at timestamptz,
  last_checked_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emergency_resources_geo_idx on public.emergency_resources(lat, lng);
create index if not exists emergency_resources_verification_idx on public.emergency_resources(verification_status, origin);
create index if not exists emergency_resources_org_idx on public.emergency_resources(managing_org_id);

-- Backward compatibility view for aed_locations
create or replace view public.aed_locations_compat as
select
  id,
  name,
  address,
  lat as latitude,
  lng as longitude,
  case when verification_status = 'verified' then 'available' else 'unknown' end as availability_status,
  source,
  verified_at,
  verification_status,
  origin,
  created_at,
  updated_at
from public.emergency_resources
where resource_type = 'aed';

-- 5. Resource Submissions & Verifications Lifecycle
create table if not exists public.resource_submissions (
  id uuid primary key default gen_random_uuid(),
  submitted_by uuid references auth.users(id) on delete set null,
  resource_type text not null default 'aed' check (resource_type in ('aed', 'first_aid_kit', 'emergency_cabinet', 'bleeding_control_kit')),
  name text not null,
  address text not null default '',
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  evidence_url text,
  managing_org_name text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resource_verifications (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.emergency_resources(id) on delete cascade,
  verified_by uuid references auth.users(id) on delete set null,
  evidence_note text,
  result text not null check (result in ('verified', 'rejected', 'expired')),
  verified_at timestamptz not null default now()
);

create table if not exists public.resource_change_history (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.emergency_resources(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  action text not null,
  previous_state jsonb,
  new_state jsonb,
  created_at timestamptz not null default now()
);

-- 6. Interventions & Evaluations (Decision -> Action -> Measure -> New Data)
create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  site_id uuid references public.sites(id) on delete set null,
  region_id text references public.regions(region_id) on delete set null,
  type text not null check (type in ('cpr_training', 'aed_verification', 'process_change', 'community_campaign')),
  title text not null,
  description text default '',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.intervention_evaluations (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.interventions(id) on delete cascade,
  metric_key text not null references public.metric_definitions(key),
  window_before text not null default '30d',
  window_after text not null default '30d',
  value_before numeric not null,
  value_after numeric not null,
  n_before integer not null default 0,
  n_after integer not null default 0,
  origin_breakdown jsonb not null default '{}'::jsonb,
  note text,
  evaluated_at timestamptz not null default now()
);

-- 7. Responders & Alerts Network (Simulation Model)
create table if not exists public.responders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  display_name text not null default 'Tình nguyện viên',
  certification_level text not null default 'internal_trained' check (certification_level in ('medical', 'cpr_certified', 'internal_trained')),
  verified boolean not null default false,
  available boolean not null default false,
  last_geohash7 text,
  consent_location_at timestamptz,
  response_rate numeric not null default 1.0,
  total_alerts integer not null default 0,
  total_accepted integer not null default 0,
  origin text not null default 'pilot_verified' check (origin in ('training_user', 'synthetic_seed', 'pilot_verified')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.responder_alerts (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents(id) on delete cascade,
  responder_id uuid not null references public.responders(id) on delete cascade,
  tier integer not null default 1,
  sent_at timestamptz not null default now(),
  ack_at timestamptz,
  outcome text not null default 'pending' check (outcome in ('pending', 'accepted', 'declined', 'timeout')),
  origin text not null default 'synthetic_seed'
);

-- 8. Digital Proofs (Immutable cryptographically signed evidence)
create table if not exists public.digital_proofs (
  id uuid primary key default gen_random_uuid(),
  incident_id text not null,
  user_id text not null,
  summary jsonb not null,
  payload_hash text not null unique,
  consent_snapshot jsonb not null,
  version text not null default '1.0',
  legal_disclaimer text not null default 'Căn cứ tham chiếu hỗ trợ hồ sơ theo TT 126/2026/TT-BCA; chưa có giá trị pháp lý cho đến khi cơ quan quản lý Quỹ công nhận.',
  created_at timestamptz not null default now()
);

-- 9. Analytical Views & Materialized Views

-- v_incident_intervals: Computes elapsed seconds between timeline milestones
create or replace view public.v_incident_intervals as
select
  i.id as incident_id,
  i.organization_id,
  i.region_cell,
  coalesce(r.region_id, i.region_cell, 'UNKNOWN') as region_id,
  i.origin,
  i.severity,
  i.status,
  i.occurred_at,
  i.occurred_at::date as incident_date,
  extract(epoch from (max(case when e.event_type = 'first_action' then e.occurred_at end) - i.occurred_at)) as open_to_first_action_sec,
  extract(epoch from (max(case when e.event_type = 'called_115' then e.occurred_at end) - i.occurred_at)) as open_to_call_sec,
  extract(epoch from (max(case when e.event_type = 'recognized' then e.occurred_at end) - i.occurred_at)) as open_to_guidance_sec,
  extract(epoch from (max(case when e.event_type = 'responder_arrived' then e.occurred_at end) - i.occurred_at)) as open_to_responder_sec
from public.incidents i
left join public.incident_timeline_events e on e.incident_id = i.id
left join public.regions r on r.region_id = i.region_cell
group by i.id, i.organization_id, i.region_cell, r.region_id, i.origin, i.severity, i.status, i.occurred_at;

-- v_incident_adi: Computes ADI for each incident using delay_thresholds single source of truth
create or replace view public.v_incident_adi as
select
  v.incident_id,
  v.organization_id,
  v.region_id,
  v.origin,
  v.severity,
  v.incident_date,
  v.open_to_guidance_sec,
  v.open_to_call_sec,
  v.open_to_first_action_sec,
  dt.time_to_guidance_sec as thresh_guidance,
  dt.time_to_call_sec as thresh_call,
  dt.time_to_action_sec as thresh_action,
  dt.mro_threshold_sec,
  -- Calculate Avoidable Delays
  greatest(0, coalesce(v.open_to_guidance_sec, dt.time_to_guidance_sec * 2) - dt.time_to_guidance_sec)::integer as guidance_delay_sec,
  greatest(0, coalesce(v.open_to_call_sec, dt.time_to_call_sec * 2) - dt.time_to_call_sec)::integer as call_delay_sec,
  greatest(0, coalesce(v.open_to_first_action_sec, dt.time_to_action_sec * 1.5) - dt.time_to_action_sec)::integer as action_delay_sec,
  -- Total ADI
  (
    greatest(0, coalesce(v.open_to_guidance_sec, dt.time_to_guidance_sec * 2) - dt.time_to_guidance_sec) +
    greatest(0, coalesce(v.open_to_call_sec, dt.time_to_call_sec * 2) - dt.time_to_call_sec) +
    greatest(0, coalesce(v.open_to_first_action_sec, dt.time_to_action_sec * 1.5) - dt.time_to_action_sec)
  )::integer as adi_sec,
  -- MRO Flag
  (
    (
      greatest(0, coalesce(v.open_to_guidance_sec, dt.time_to_guidance_sec * 2) - dt.time_to_guidance_sec) +
      greatest(0, coalesce(v.open_to_call_sec, dt.time_to_call_sec * 2) - dt.time_to_call_sec) +
      greatest(0, coalesce(v.open_to_first_action_sec, dt.time_to_action_sec * 1.5) - dt.time_to_action_sec)
    ) > dt.mro_threshold_sec
  ) as mro_flag
from public.v_incident_intervals v
left join public.delay_thresholds dt on dt.scenario_category = case
  when v.severity = 'critical' then 'cardiac_arrest'
  when v.severity = 'emergency' then 'stroke'
  else 'default'
end;

-- mv_region_daily_adi: Daily aggregates per region with k-anonymity (suppress cells < 5)
create or replace view public.v_region_daily_adi as
select
  region_id,
  incident_date,
  origin,
  count(*)::integer as incident_count,
  case when count(*) < 5 then true else false end as suppressed,
  case when count(*) >= 5 then round(avg(open_to_first_action_sec)) else null end as avg_response_time_sec,
  case when count(*) >= 5 then round(avg(adi_sec)) else null end as adi_avg,
  case when count(*) >= 5 then round(avg(open_to_guidance_sec)) else null end as avg_ttg_sec,
  case when count(*) >= 5 then round(avg(open_to_call_sec)) else null end as avg_ttc_sec,
  case when count(*) >= 5 then round((count(case when mro_flag then 1 end)::numeric / count(*)) * 100) else null end as mro_rate_percent
from public.v_incident_adi
group by region_id, incident_date, origin;

-- 10. Row Level Security & Permissions
alter table public.delay_thresholds enable row level security;
alter table public.metric_definitions enable row level security;
alter table public.regions enable row level security;
alter table public.emergency_resources enable row level security;
alter table public.resource_submissions enable row level security;
alter table public.resource_verifications enable row level security;
alter table public.resource_change_history enable row level security;
alter table public.interventions enable row level security;
alter table public.intervention_evaluations enable row level security;
alter table public.responders enable row level security;
alter table public.responder_alerts enable row level security;
alter table public.digital_proofs enable row level security;

-- Delay thresholds, metrics, and regions are publicly readable
create policy delay_thresholds_public_read on public.delay_thresholds for select to anon, authenticated using (true);
create policy metric_definitions_public_read on public.metric_definitions for select to anon, authenticated using (true);
create policy regions_public_read on public.regions for select to anon, authenticated using (true);

-- CRITICAL SAFETY POLICY: Public / nearby can ONLY see verified non-synthetic resources!
drop policy if exists emergency_resources_public_read on public.emergency_resources;
create policy emergency_resources_public_read on public.emergency_resources
  for select to anon, authenticated
  using (verification_status = 'verified' and origin <> 'synthetic_seed');

-- Digital proofs: Users can view their own, insert new; NEVER update or delete (immutable)
create policy digital_proofs_select_own on public.digital_proofs
  for select to authenticated
  using (user_id = (select auth.uid())::text);

create policy digital_proofs_insert_own on public.digital_proofs
  for insert to authenticated
  with check (user_id = (select auth.uid())::text);

revoke update, delete on public.digital_proofs from anon, authenticated;

-- Grants
grant select on public.delay_thresholds, public.metric_definitions, public.regions to anon, authenticated;
grant select on public.emergency_resources to anon, authenticated;
grant select, insert on public.digital_proofs to authenticated;
grant select on public.v_incident_intervals, public.v_incident_adi, public.v_region_daily_adi to authenticated;
