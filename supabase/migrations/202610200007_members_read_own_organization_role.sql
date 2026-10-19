-- Let signed-in users read only their own organization memberships and the
-- organizations they belong to. This is needed to resolve the role-based UI.
grant select on public.organization_members, public.organizations to authenticated;

drop policy if exists organization_members_read_own on public.organization_members;
create policy organization_members_read_own
  on public.organization_members
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists organizations_read_for_members on public.organizations;
create policy organizations_read_for_members
  on public.organizations
  for select to authenticated
  using (
    exists (
      select 1
      from public.organization_members m
      where m.organization_id = organizations.id
        and m.user_id = (select auth.uid())
        and m.is_active
    )
  );
