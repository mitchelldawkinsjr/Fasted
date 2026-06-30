-- Backfill default commitments for groups created before group_commitments existed.

insert into group_commitments (group_id, commitments)
select
  g.id,
  '[
    {"id":"move-default","label":"Move body daily","shape":"duration","target":30,"description":"At least 30 minutes of movement"},
    {"id":"food-default","label":"Follow eating structure","shape":"yes_no"},
    {"id":"fast-default","label":"Complete today''s fast","shape":"yes_no"},
    {"id":"prayer-default","label":"Intentional time with God","shape":"yes_no"},
    {"id":"honest-default","label":"Be honest in check-ins","shape":"yes_no"}
  ]'::jsonb
from groups g
where not exists (
  select 1 from group_commitments gc where gc.group_id = g.id
);
