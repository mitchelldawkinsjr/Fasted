-- Multi-tenancy: organizations, groups, memberships, community features

create table organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text unique not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

create table journeys (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('built-in', 'custom')),
  name        text not null,
  start_date  date,
  phases      jsonb,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

create table groups (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizations(id) on delete set null,
  journey_id   uuid references journeys(id) on delete restrict not null,
  name         text not null,
  invite_code  text unique not null,
  privacy      text not null default 'anonymous' check (privacy in ('anonymous', 'named')),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

create table group_memberships (
  id            uuid primary key default gen_random_uuid(),
  group_id      uuid references groups(id) on delete cascade not null,
  user_id       uuid references auth.users(id) on delete cascade not null,
  role          text not null default 'member' check (role in ('leader', 'member')),
  display_name  text,
  joined_at     timestamptz default now(),
  unique (group_id, user_id)
);

create table shared_journal_entries (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  content     jsonb not null,
  phase_id    int,
  shared_at   timestamptz default now()
);

create table prayer_requests (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid references groups(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  content     text not null,
  is_anonymous boolean not null default true,
  pinned      boolean default false,
  created_at  timestamptz default now()
);

create index idx_groups_invite_code on groups (invite_code);
create index idx_group_memberships_user on group_memberships (user_id);
create index idx_group_memberships_group on group_memberships (group_id);
create index idx_shared_journal_group on shared_journal_entries (group_id, shared_at desc);
create index idx_prayer_requests_group on prayer_requests (group_id, created_at desc);

-- Helpers
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_memberships
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_group_leader(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from group_memberships
    where group_id = p_group_id and user_id = auth.uid() and role = 'leader'
  );
$$;

create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;

-- RLS
alter table organizations enable row level security;
alter table journeys enable row level security;
alter table groups enable row level security;
alter table group_memberships enable row level security;
alter table shared_journal_entries enable row level security;
alter table prayer_requests enable row level security;

-- Organizations: creator can manage; members of org groups can read
create policy "org creators manage"
  on organizations for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "org members read"
  on organizations for select
  using (
    id in (
      select g.org_id from groups g
      join group_memberships gm on gm.group_id = g.id
      where gm.user_id = auth.uid() and g.org_id is not null
    )
  );

-- Journeys: creators + group members can read
create policy "journey creators manage"
  on journeys for all
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

create policy "group members read journeys"
  on journeys for select
  using (
    id in (
      select g.journey_id from groups g
      join group_memberships gm on gm.group_id = g.id
      where gm.user_id = auth.uid()
    )
  );

-- Groups: members read; leaders update; creator inserts
create policy "members read groups"
  on groups for select
  using (public.is_group_member(id) or created_by = auth.uid());

create policy "leaders update groups"
  on groups for update
  using (public.is_group_leader(id))
  with check (public.is_group_leader(id));

create policy "authenticated create groups"
  on groups for insert
  with check (created_by = auth.uid());

-- Memberships (FOR ALL — PostgREST does not apply INSERT-only policies reliably)
create policy "membership access"
  on group_memberships for all
  using (
    user_id = auth.uid()
    or public.is_group_member(group_id)
    or public.is_group_leader(group_id)
  )
  with check (user_id = auth.uid() or public.is_group_leader(group_id));

create policy "members leave group"
  on group_memberships for delete
  using (user_id = auth.uid());

create policy "leaders update memberships"
  on group_memberships for update
  using (public.is_group_leader(group_id))
  with check (public.is_group_leader(group_id));

-- Shared journal
create policy "members read shared journal"
  on shared_journal_entries for select
  using (public.is_group_member(group_id));

create policy "members share journal"
  on shared_journal_entries for insert
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "authors delete shared journal"
  on shared_journal_entries for delete
  using (user_id = auth.uid());

-- Prayer wall
create policy "members read prayer requests"
  on prayer_requests for select
  using (public.is_group_member(group_id));

create policy "members post prayer requests"
  on prayer_requests for insert
  with check (user_id = auth.uid() and public.is_group_member(group_id));

create policy "leaders pin prayer requests"
  on prayer_requests for update
  using (public.is_group_leader(group_id))
  with check (public.is_group_leader(group_id));

create policy "authors delete prayer requests"
  on prayer_requests for delete
  using (user_id = auth.uid());

-- Leaders can read member progress for dashboard aggregates
create policy "leaders read member progress"
  on user_progress for select
  using (
    auth.uid() = user_id
    or exists (
      select 1
      from group_memberships member
      join group_memberships leader on leader.group_id = member.group_id
      where member.user_id = user_progress.user_id
        and leader.user_id = auth.uid()
        and leader.role = 'leader'
    )
  );

-- Join by invite code (security definer)
create or replace function public.join_group_by_code(
  p_invite_code text,
  p_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select id into v_group_id
  from groups
  where upper(invite_code) = upper(trim(p_invite_code));

  if v_group_id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into group_memberships (group_id, user_id, role, display_name)
  values (v_group_id, auth.uid(), 'member', nullif(trim(p_display_name), ''))
  on conflict (group_id, user_id) do update
    set display_name = coalesce(excluded.display_name, group_memberships.display_name);

  return v_group_id;
end;
$$;

grant execute on function public.join_group_by_code(text, text) to authenticated;

-- Preview group by invite code (name only, no member data)
create or replace function public.preview_group_by_code(p_invite_code text)
returns table (id uuid, name text, privacy text)
language sql
security definer
set search_path = public
as $$
  select g.id, g.name, g.privacy
  from groups g
  where upper(g.invite_code) = upper(trim(p_invite_code))
  limit 1;
$$;

grant execute on function public.preview_group_by_code(text) to authenticated;

-- Aggregate stats view for leader dashboard
create or replace view group_checkin_stats as
select
  gm.group_id,
  count(distinct gm.user_id)::int as member_count,
  count(ci.value)::int as total_checkins,
  round(
    count(ci.value)::numeric / nullif(count(distinct gm.user_id), 0),
    2
  ) as avg_checkins_per_member
from group_memberships gm
left join user_progress up on up.user_id = gm.user_id
left join lateral jsonb_array_elements(
  coalesce(up.data->'groupCheckIns'->(gm.group_id::text), '[]'::jsonb)
) ci on true
group by gm.group_id;

grant select on group_checkin_stats to authenticated;
