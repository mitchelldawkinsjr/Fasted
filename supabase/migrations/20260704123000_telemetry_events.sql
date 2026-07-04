-- Client observability events. Browser clients may insert only; operators read
-- with the service role key through Supabase Studio or scripts.

create table telemetry_events (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  reported_at timestamptz not null,
  level       text not null check (level in ('error', 'warning', 'info')),
  message     text not null check (char_length(message) <= 2000),
  context     jsonb not null default '{}'::jsonb,
  path        text,
  user_agent  text,
  user_id     uuid references auth.users(id) on delete set null default auth.uid()
);

alter table telemetry_events enable row level security;

create policy "clients can record telemetry events"
  on telemetry_events for insert
  to anon, authenticated
  with check (true);

create index telemetry_events_created_at_idx
  on telemetry_events (created_at desc);

create index telemetry_events_level_created_at_idx
  on telemetry_events (level, created_at desc);
