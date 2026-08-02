-- 008 — The WaveSight Daily archive. One row per issue date; the generator
-- upserts on report_date so a re-run refreshes the day's issue instead of
-- duplicating it. Read by /today and /api/daily/newsletter.
--
-- Reversible: see 008_daily_reports_rollback.sql

create table if not exists public.daily_reports (
  id text primary key,
  report_date date not null unique,
  title text not null,
  summary text not null,
  top_trend_ids jsonb not null default '[]'::jsonb,
  generated_report text not null,
  created_at timestamptz not null default now()
);

create index if not exists daily_reports_date_idx
  on public.daily_reports (report_date desc);
