-- 003 — The forecast log. Every flag the system raises becomes a falsifiable
-- claim with a deadline, resolved and scored against trend_snapshots.
--
-- Mutation rules, enforced by trigger:
--   * a pending row may be resolved exactly once (status -> hit/miss/void,
--     stamping resolved_at / observed_value / resolution_note)
--   * a resolved row is immutable, DELETE is never allowed
-- forecast_resolution_log is fully append-only — one audit row per resolution.
--
-- Reversible: see 003_forecasts_rollback.sql

create table if not exists public.forecasts (
  forecast_id text primary key,
  trend_id text not null references public.trends(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_in_run_id text not null references public.pulse_runs(id) on delete cascade,
  claim_type text not null
    check (claim_type in ('peak_within','sustains_above','fades_below')),
  horizon_days integer not null check (horizon_days > 0),
  target_value numeric,
  confidence numeric not null check (confidence >= 0 and confidence <= 1),
  -- For peak_within: claim-window end + 14-day confirmation lag. Peaks are
  -- only confirmable in arrears; the lag is deliberate and lives here.
  resolves_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending','hit','miss','void')),
  resolved_at timestamptz,
  observed_value numeric,
  resolution_note text
);

create index if not exists forecasts_status_idx
  on public.forecasts (status, resolves_at);
create index if not exists forecasts_trend_idx
  on public.forecasts (trend_id, created_at desc);

create or replace function public.forecasts_guard()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'forecasts rows are never deleted';
  end if;
  if old.status <> 'pending' then
    raise exception 'forecast % is already resolved and immutable', old.forecast_id;
  end if;
  if new.status = 'pending' and new is distinct from old then
    raise exception 'pending forecasts may only be mutated by resolving them';
  end if;
  -- Resolving: the claim itself must not be rewritten while scoring it.
  if (new.trend_id, new.created_at, new.created_in_run_id, new.claim_type,
      new.horizon_days, new.target_value, new.confidence, new.resolves_at)
     is distinct from
     (old.trend_id, old.created_at, old.created_in_run_id, old.claim_type,
      old.horizon_days, old.target_value, old.confidence, old.resolves_at) then
    raise exception 'forecast claims are immutable; only resolution fields may be written';
  end if;
  return new;
end $$;

drop trigger if exists forecasts_guard on public.forecasts;
create trigger forecasts_guard
  before update or delete on public.forecasts
  for each row execute function public.forecasts_guard();

create table if not exists public.forecast_resolution_log (
  id text primary key,
  forecast_id text not null references public.forecasts(forecast_id) on delete cascade,
  evaluated_at timestamptz not null default now(),
  status text not null check (status in ('pending','hit','miss','void')),
  observed_value numeric,
  detail jsonb
);

create index if not exists forecast_resolution_log_forecast_idx
  on public.forecast_resolution_log (forecast_id, evaluated_at desc);

drop trigger if exists forecast_resolution_log_append_only on public.forecast_resolution_log;
create trigger forecast_resolution_log_append_only
  before update or delete on public.forecast_resolution_log
  for each row execute function public.reject_mutation();

alter table public.forecasts enable row level security;
alter table public.forecast_resolution_log enable row level security;
drop policy if exists "public read forecasts" on public.forecasts;
create policy "public read forecasts"
  on public.forecasts for select using (true);
drop policy if exists "public read forecast_resolution_log" on public.forecast_resolution_log;
create policy "public read forecast_resolution_log"
  on public.forecast_resolution_log for select using (true);
