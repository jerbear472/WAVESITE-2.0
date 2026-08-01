-- Rollback for 001_extend_trend_snapshots.sql
drop trigger if exists trend_snapshots_append_only on public.trend_snapshots;
alter table public.trend_snapshots
  drop column if exists state,
  drop column if exists source_count;
-- reject_mutation() is shared with later migrations; drop it only if nothing
-- else uses it:
-- drop function if exists public.reject_mutation();
