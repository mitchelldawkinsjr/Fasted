-- Remove unused aggregate view that granted all authenticated users
-- cross-group stats without membership checks.

drop view if exists public.group_checkin_stats;
