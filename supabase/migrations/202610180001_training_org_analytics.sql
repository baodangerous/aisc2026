-- Link training sessions to organizations for privacy-preserving aggregate analytics.
alter table public.training_sessions add column if not exists organization_id uuid references public.organizations(id) on delete set null;
alter table public.training_sessions add column if not exists consent_to_organization_analytics boolean not null default false;
create index if not exists training_sessions_organization_idx on public.training_sessions(organization_id, completed_at desc);

drop policy if exists training_sessions_select_org_admin on public.training_sessions;
create policy training_sessions_select_org_admin on public.training_sessions
for select to authenticated using (
  exists (
    select 1 from public.organization_members member
    where member.organization_id = training_sessions.organization_id
      and member.user_id = (select auth.uid())
      and member.role in ('owner', 'admin', 'analyst')
  )
);

grant select on public.training_sessions to authenticated;
