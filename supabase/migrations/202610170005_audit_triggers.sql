-- ============================================================================
-- MIGRATION: 202610170005_audit_triggers.sql
-- Description: Audit triggers for security-critical actions:
--              1. User role changes
--              2. Modifying/deleting community forum posts
--              3. Approving/rejecting emergency resource submissions
--              4. Updating dataset versions & knowledge documents
--              5. Modifying organization members
--              6. Creating digital proofs
-- ============================================================================

-- Function to record audit logs automatically
create or replace function public.log_audit_event()
returns trigger
language plpgsql
security definer
as $$
declare
  v_actor_id text;
  v_action text;
  v_entity_type text;
  v_entity_id text;
  v_metadata jsonb;
begin
  -- Identify current actor if authenticated
  v_actor_id := coalesce(auth.uid()::text, current_setting('request.jwt.claim.sub', true), 'system');
  v_entity_type := TG_TABLE_NAME;

  if TG_OP = 'INSERT' then
    v_action := 'CREATE';
    v_entity_id := coalesce(NEW.id::text, NEW.version::text, 'unknown');
    v_metadata := jsonb_build_object('new', to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    v_action := 'UPDATE';
    v_entity_id := coalesce(NEW.id::text, NEW.version::text, OLD.id::text, 'unknown');
    v_metadata := jsonb_build_object('old', to_jsonb(OLD), 'new', to_jsonb(NEW));
  elsif TG_OP = 'DELETE' then
    v_action := 'DELETE';
    v_entity_id := coalesce(OLD.id::text, OLD.version::text, 'unknown');
    v_metadata := jsonb_build_object('old', to_jsonb(OLD));
  end if;

  -- Custom context for specific critical events
  if TG_TABLE_NAME = 'resource_submissions' and TG_OP = 'UPDATE' then
    if OLD.status <> NEW.status then
      v_action := 'REVIEW_SUBMISSION';
      v_metadata := jsonb_build_object(
        'previous_status', OLD.status,
        'new_status', NEW.status,
        'rejection_reason', NEW.rejection_reason,
        'resource_type', NEW.resource_type,
        'name', NEW.name
      );
    end if;
  elsif TG_TABLE_NAME = 'organization_members' then
    if TG_OP = 'UPDATE' and OLD.role <> NEW.role then
      v_action := 'ROLE_CHANGE';
      v_metadata := jsonb_build_object('previous_role', OLD.role, 'new_role', NEW.role);
    elsif TG_OP = 'INSERT' then
      v_action := 'MEMBER_ADDED';
    elsif TG_OP = 'DELETE' then
      v_action := 'MEMBER_REMOVED';
    end if;
  elsif TG_TABLE_NAME = 'digital_proofs' and TG_OP = 'INSERT' then
    v_action := 'CREATE_DIGITAL_PROOF';
    v_metadata := jsonb_build_object(
      'incident_id', NEW.incident_id,
      'payload_hash', NEW.payload_hash,
      'legal_disclaimer', NEW.legal_disclaimer
    );
  end if;

  -- Insert into audit_logs table
  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata,
    created_at
  ) values (
    v_actor_id,
    v_action,
    v_entity_type,
    v_entity_id,
    v_metadata,
    now()
  );

  return coalesce(NEW, OLD);
end;
$$;

-- 1. Trigger for Organization Member Role & Membership Changes
drop trigger if exists trg_audit_org_members on public.organization_members;
create trigger trg_audit_org_members
after insert or update or delete on public.organization_members
for each row execute function public.log_audit_event();

-- 2. Trigger for Resource Submissions Review (Approve / Reject)
drop trigger if exists trg_audit_resource_submissions on public.resource_submissions;
create trigger trg_audit_resource_submissions
after update on public.resource_submissions
for each row execute function public.log_audit_event();

-- 3. Trigger for Community Forum Posts (Edit / Delete)
drop trigger if exists trg_audit_forum_posts on public.forum_posts;
create trigger trg_audit_forum_posts
after update or delete on public.forum_posts
for each row execute function public.log_audit_event();

-- 4. Trigger for AI Dataset Versions & Knowledge Documents Governance
drop trigger if exists trg_audit_dataset_versions on public.ai_dataset_versions;
create trigger trg_audit_dataset_versions
after insert or update or delete on public.ai_dataset_versions
for each row execute function public.log_audit_event();

drop trigger if exists trg_audit_knowledge_documents on public.knowledge_documents;
create trigger trg_audit_knowledge_documents
after insert or update or delete on public.knowledge_documents
for each row execute function public.log_audit_event();

-- 5. Trigger for Digital Proofs Creation
drop trigger if exists trg_audit_digital_proofs on public.digital_proofs;
create trigger trg_audit_digital_proofs
after insert on public.digital_proofs
for each row execute function public.log_audit_event();

-- 6. Pilot Surveys Table for Phase 3B Real Sessions Pre/Post
create table if not exists public.pilot_surveys (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  device_hash text not null,
  survey_type text not null check (survey_type in ('pre', 'post')),
  scenario_id text not null,
  confidence_score integer not null check (confidence_score between 1 and 5),
  preparedness_score integer not null check (preparedness_score between 1 and 5),
  anxiety_score integer not null check (anxiety_score between 1 and 5),
  sus_scores jsonb default null, -- System Usability Scale 10 questions (1-5 each) for post survey
  sus_final_score numeric default null check (sus_final_score is null or (sus_final_score between 0 and 100)),
  consent boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists pilot_surveys_session_idx on public.pilot_surveys(session_id);
create index if not exists pilot_surveys_device_idx on public.pilot_surveys(device_hash);

alter table public.pilot_surveys enable row level security;
create policy pilot_surveys_insert on public.pilot_surveys for insert to anon, authenticated with check (consent = true);
create policy pilot_surveys_read_auth on public.pilot_surveys for select to authenticated using (true);
grant insert on public.pilot_surveys to anon, authenticated;
grant select on public.pilot_surveys to authenticated;
