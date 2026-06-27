-- Fix group_memberships RLS: PostgREST requires FOR ALL policies for inserts to apply.
-- INSERT-only policies were silently blocking create-group leader bootstrap.

drop policy if exists "members read memberships in their groups" on group_memberships;
drop policy if exists "users join groups" on group_memberships;
drop policy if exists "users leave own membership" on group_memberships;
drop policy if exists "leaders manage memberships" on group_memberships;

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
