-- 001 — Extend trend_snapshots into the canonical observation history.
-- trend_snapshots already holds one scored row per trend per run (append-only
-- by convention); this migration adds the two fields the forecast log needs
-- and makes append-only a database guarantee instead of a convention.
--
-- Reversible: see 001_extend_trend_snapshots_rollback.sql

-- 1. New columns. Nullable: rows older than this migration have no captured
--    state, and pretending otherwise would corrupt the history.
alter table public.trend_snapshots
  add column if not exists state text
    check (state in ('in_sync','rising','warming','fading')),
  add column if not exists source_count integer;

-- 2. Backfill state for existing rows from stored harmony, using the same
--    thresholds as lib/harmony.ts (>=90 in_sync, >=74 rising, >=55 warming).
--    Approximate on purpose: lifecycle_stage per run was never snapshotted, so
--    the declining/saturated -> fading override cannot be reconstructed.
--    source_count stays null (unknown), never fabricated as 0.
update public.trend_snapshots
set state = case
  when harmony >= 90 then 'in_sync'
  when harmony >= 74 then 'rising'
  when harmony >= 55 then 'warming'
  else 'fading'
end
where state is null;

-- 3. Append-only, enforced. Snapshots are the track record's raw material —
--    an UPDATE or DELETE here silently rewrites history.
create or replace function public.reject_mutation()
returns trigger language plpgsql as $$
begin
  raise exception '% is append-only: % not allowed', tg_table_name, tg_op;
end $$;

drop trigger if exists trend_snapshots_append_only on public.trend_snapshots;
create trigger trend_snapshots_append_only
  before update or delete on public.trend_snapshots
  for each row execute function public.reject_mutation();
