-- 002 — trend_evidence: the single canonical "says who" store.
-- Every scored trend must be traceable to the specific items that produced its
-- score. Capped at 20 items per trend per run in application code (highest
-- engagement kept). Supersedes the legacy signals/trend_signals pair, which
-- remains for manual admin imports only.
--
-- run_id is nullable: deep scans capture evidence outside a pulse run.
-- Reversible: see 002_trend_evidence_rollback.sql

create table if not exists public.trend_evidence (
  id text primary key,
  trend_id text not null references public.trends(id) on delete cascade,
  run_id text references public.pulse_runs(id) on delete set null,
  source_url text not null,
  platform text not null default '',
  author_handle text,
  captured_at timestamptz not null default now(),
  excerpt text,
  engagement_metrics jsonb
);

create index if not exists trend_evidence_trend_idx
  on public.trend_evidence (trend_id, captured_at desc);
create index if not exists trend_evidence_run_idx
  on public.trend_evidence (run_id);

-- Append-only: evidence is the audit trail behind published scores.
drop trigger if exists trend_evidence_append_only on public.trend_evidence;
create trigger trend_evidence_append_only
  before update or delete on public.trend_evidence
  for each row execute function public.reject_mutation();

alter table public.trend_evidence enable row level security;
drop policy if exists "public read trend_evidence" on public.trend_evidence;
create policy "public read trend_evidence"
  on public.trend_evidence for select using (true);
