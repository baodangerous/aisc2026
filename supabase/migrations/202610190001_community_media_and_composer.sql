-- Community composer extensions: preserve existing forum schema and add audited media metadata.
alter table public.forum_posts
  add column if not exists title text not null default 'Chia sẻ cộng đồng',
  add column if not exists body text not null default '',
  add column if not exists author_uid uuid references auth.users(id) on delete set null,
  add column if not exists category text not null default 'general',
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.forum_comments
  add column if not exists author_uid uuid references auth.users(id) on delete set null;

create table if not exists public.community_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.forum_posts(id) on delete cascade,
  owner_uid uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  media_type text not null check (media_type in ('image', 'video')),
  file_name text not null,
  created_at timestamptz not null default now()
);

alter table public.community_media enable row level security;
create policy community_media_public_read on public.community_media for select to anon, authenticated using (true);
create policy community_media_owner_insert on public.community_media for insert to authenticated with check ((select auth.uid()) = owner_uid);
create policy community_media_owner_delete on public.community_media for delete to authenticated using ((select auth.uid()) = owner_uid);
grant select on public.community_media to anon, authenticated;
grant insert, delete on public.community_media to authenticated;

insert into storage.buckets (id, name, public)
values ('community-media', 'community-media', true)
on conflict (id) do nothing;

create policy community_media_objects_public_read on storage.objects for select to anon, authenticated using (bucket_id = 'community-media');
create policy community_media_objects_owner_insert on storage.objects for insert to authenticated with check (bucket_id = 'community-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
create policy community_media_objects_owner_delete on storage.objects for delete to authenticated using (bucket_id = 'community-media' and (storage.foldername(name))[1] = (select auth.uid()::text));
