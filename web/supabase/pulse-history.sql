-- WaveSight — Pulse history persistence
-- Run in the Supabase SQL editor of the project pointed to by
-- NEXT_PUBLIC_SUPABASE_URL. Creates the three tables the pulse loop writes:
-- trends (slug-keyed library), pulse_runs (one row per discovery run), and
-- trend_snapshots (per-trend scores captured at every run — the timeline).
--
-- Note: ids are TEXT, not uuid — the app generates ids like "trend-<slug>"
-- and "pulse-<timestamp>" so history stays joinable across environments.

create table if not exists public.trends (
  id text primary key,
  name text not null,
  slug text unique not null,
  one_line_summary text not null default '',
  detailed_summary text not null default '',
  category text not null default '',
  emotional_tone text not null default '',
  audience text not null default '',
  lifecycle_stage text not null default 'emerging',
  virality_type text not null default 'other',
  wavescore integer not null default 0,
  momentum_score integer not null default 0,
  sentiment_score integer not null default 0,
  brand_safety_score integer not null default 0,
  saturation_score integer not null default 0,
  commercial_relevance_score integer not null default 0,
  participation_difficulty text not null default 'medium',
  risk_level text not null default 'low',
  why_spreading text not null default '',
  who_should_join text not null default '',
  who_should_avoid text not null default '',
  best_platforms text[] not null default '{}',
  creative_angles text[] not null default '{}',
  sample_hooks text[] not null default '{}',
  origin text not null default 'pulse',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pulse_runs (
  id text primary key,
  ran_at timestamptz not null default now(),
  mode text not null default 'live' check (mode in ('live','mock')),
  trends_discovered integer not null default 0,
  trends_updated integer not null default 0,
  focus text not null default '',
  notes text
);

create table if not exists public.trend_snapshots (
  id text primary key,
  trend_id text not null references public.trends(id) on delete cascade,
  run_id text not null references public.pulse_runs(id) on delete cascade,
  wavescore integer not null default 0,
  harmony integer not null default 0,
  momentum_score integer not null default 0,
  sentiment_score integer not null default 0,
  captured_at timestamptz not null default now()
);

create index if not exists trend_snapshots_trend_idx
  on public.trend_snapshots (trend_id, captured_at);
create index if not exists trend_snapshots_run_idx
  on public.trend_snapshots (run_id);
create index if not exists pulse_runs_ran_at_idx
  on public.pulse_runs (ran_at desc);

-- RLS: anyone can read the terminal; only the service role (server) writes.
alter table public.trends enable row level security;
alter table public.pulse_runs enable row level security;
alter table public.trend_snapshots enable row level security;

drop policy if exists "public read trends" on public.trends;
create policy "public read trends" on public.trends for select using (true);
drop policy if exists "public read pulse_runs" on public.pulse_runs;
create policy "public read pulse_runs" on public.pulse_runs for select using (true);
drop policy if exists "public read trend_snapshots" on public.trend_snapshots;
create policy "public read trend_snapshots" on public.trend_snapshots for select using (true);
