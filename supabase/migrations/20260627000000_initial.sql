-- Fasted Calendar: user progress blob (replaces PocketBase progress collection)

create table user_progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade not null unique,
  data       jsonb not null,
  updated_at timestamptz default now()
);

alter table user_progress enable row level security;

create policy "users own their progress"
  on user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
