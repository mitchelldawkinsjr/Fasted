-- Journey Together: leader-defined commitments, member covenants, leader-safe progress

create table group_commitments (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid references groups(id) on delete cascade not null unique,
  commitments  jsonb not null default '[]'::jsonb,
  created_at   timestamptz default now()
);

create table member_covenants (
  id                    uuid primary key default gen_random_uuid(),
  group_id              uuid references groups(id) on delete cascade not null,
  user_id               uuid references auth.users(id) on delete cascade not null,
  commitments_snapshot  jsonb not null,
  signature             text not null,
  signed_at             timestamptz default now(),
  unique (group_id, user_id)
);

create index idx_member_covenants_group on member_covenants (group_id);
create index idx_member_covenants_user on member_covenants (user_id);

alter table group_commitments enable row level security;
alter table member_covenants enable row level security;

-- Group commitments: members read; leaders manage
create policy "members read group commitments"
  on group_commitments for select
  using (public.is_group_member(group_id));

create policy "leaders manage group commitments"
  on group_commitments for all
  using (public.is_group_leader(group_id))
  with check (public.is_group_leader(group_id));

-- Member covenants: members insert own; group members read
create policy "members read covenants in group"
  on member_covenants for select
  using (public.is_group_member(group_id));

create policy "members sign own covenant"
  on member_covenants for insert
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "members update own covenant"
  on member_covenants for update
  using (user_id = auth.uid() and public.is_group_member(group_id))
  with check (user_id = auth.uid() and public.is_group_member(group_id));

-- Privacy: leaders no longer read full user_progress blobs
drop policy if exists "leaders read member progress" on user_progress;

-- Leader-safe progress: only this group's commitment check-ins (no journal/personal check-ins).
drop function if exists public.get_leader_member_progress(uuid);

create or replace function public.get_leader_member_progress(p_group_id uuid)
returns table (
  user_id uuid,
  group_check_ins jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    gm.user_id,
    coalesce(up.data->'groupCheckIns'->(p_group_id::text), '[]'::jsonb)
  from group_memberships gm
  left join user_progress up on up.user_id = gm.user_id
  where gm.group_id = p_group_id
    and public.is_group_leader(p_group_id);
$$;

grant execute on function public.get_leader_member_progress(uuid) to authenticated;
