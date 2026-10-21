-- Allow community emergency alerts to reference user-submitted media.
-- Media URLs are stored only after an authenticated user explicitly publishes an alert.
alter table public.community_alerts
  add column if not exists media jsonb not null default '[]'::jsonb;

alter table public.community_alerts
  add constraint community_alerts_media_is_array
  check (jsonb_typeof(media) = 'array');
