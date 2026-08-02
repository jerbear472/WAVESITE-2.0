-- 007 — Term signals layer: measurements, not content.
-- A single term registry that every source reports COUNTS against, so a
-- Wikipedia pageview series and a Reddit mention series become comparable.
-- We store counts, baselines, derived scores, and provenance (a link plus a
-- short excerpt). We never store a content archive here — that is both a
-- compliance requirement and a cost decision.
--
-- Reversible: see 007_term_signals_rollback.sql

-- ---------------------------------------------------------------------------
-- terms — the spine. One row per tracked term; all sources report against
-- term_id. status lifecycle: candidate (frontier, unproven) -> tracked
-- (measured daily) -> promoted (accelerating on multiple sources) -> retired.
-- trend_id optionally links a term to the existing trend library row it
-- seeded from, connecting this layer to the Pulse/board views.
-- ---------------------------------------------------------------------------
create table if not exists public.terms (
  term_id text primary key,
  canonical text not null unique,
  variants jsonb not null default '[]'::jsonb,
  category text,
  status text not null default 'candidate'
    check (status in ('candidate','tracked','promoted','retired')),
  source_of_discovery text not null default 'seed',
  trend_id text references public.trends(id) on delete set null,
  wiki_title text,
  first_seen_at timestamptz not null default now(),
  retired_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists terms_status_idx on public.terms (status);

-- ---------------------------------------------------------------------------
-- term_observations — one row per (term, source, UTC day): the raw count.
-- meta is PROVENANCE ONLY: {link, excerpt} with the excerpt capped in app
-- code. approximate=true when the platform could only bound the count
-- (pagination caps, YouTube's estimated totalResults).
-- id = "{term_id}|{source}|{date}" so re-running a date upserts in place —
-- idempotent by construction, never double-counted.
-- ---------------------------------------------------------------------------
create table if not exists public.term_observations (
  id text primary key,
  term_id text not null references public.terms(term_id) on delete cascade,
  source text not null,
  obs_date date not null,
  raw_count numeric not null,
  approximate boolean not null default false,
  meta jsonb,
  captured_at timestamptz not null default now(),
  unique (term_id, source, obs_date)
);
create index if not exists term_observations_series_idx
  on public.term_observations (term_id, source, obs_date desc);
create index if not exists term_observations_date_idx
  on public.term_observations (obs_date);

-- ---------------------------------------------------------------------------
-- term_scores — one row per (term, source, day): the raw count NEXT TO its
-- own trailing baseline and the scores derived from it. Terms are normalized
-- against THEMSELVES only; cross-term comparison happens at the composite
-- stage via percentiles.
-- suppressed records WHY a score was withheld ('volume_floor',
-- 'insufficient_baseline') — a withheld score is data, not a gap.
-- flagged = z above threshold today; persistent = flagged on >=3 of the
-- trailing 5 days (single-day spikes are almost always noise).
-- ---------------------------------------------------------------------------
create table if not exists public.term_scores (
  id text primary key,
  term_id text not null references public.terms(term_id) on delete cascade,
  source text not null,
  score_date date not null,
  raw_count numeric not null,
  baseline_mean numeric,
  baseline_sd numeric,
  baseline_n integer not null default 0,
  z_score numeric,
  percentile numeric,
  suppressed text check (suppressed in ('volume_floor','insufficient_baseline')),
  flagged boolean not null default false,
  persistent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (term_id, source, score_date)
);
create index if not exists term_scores_series_idx
  on public.term_scores (term_id, source, score_date desc);
create index if not exists term_scores_flagged_idx
  on public.term_scores (term_id, source, score_date) where persistent;

-- ---------------------------------------------------------------------------
-- term_composites — one row per (term, day): the cross-source read.
-- breadth counts sources persistently above threshold TODAY, over available
-- sources only (sources_missing records which adapters didn't report).
-- cascade_state is the primary output — derived from WHICH sources have
-- fired and in what order (bluesky/reddit -> google_trends -> youtube ->
-- wikipedia), not from score magnitude.
-- lead_estimate_days = days between the first source firing and the most
-- recent — the empirical measure of how early we caught it.
-- ---------------------------------------------------------------------------
create table if not exists public.term_composites (
  id text primary key,
  term_id text not null references public.terms(term_id) on delete cascade,
  score_date date not null,
  breadth integer not null default 0,
  composite_score numeric not null default 0,
  cascade_state text not null default 'dormant'
    check (cascade_state in
      ('dormant','embryonic','emerging','breaking','mainstream','decaying')),
  lead_estimate_days integer,
  sources_available jsonb not null default '[]'::jsonb,
  sources_flagged jsonb not null default '[]'::jsonb,
  sources_missing jsonb not null default '[]'::jsonb,
  first_fired jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (term_id, score_date)
);
create index if not exists term_composites_date_idx
  on public.term_composites (score_date desc, composite_score desc);
create index if not exists term_composites_state_idx
  on public.term_composites (cascade_state, score_date desc);

-- ---------------------------------------------------------------------------
-- term_events — audit log of registry transitions (created / promoted /
-- retired / reactivated). Retirements are logged here so the frontier can
-- expand without silently ballooning.
-- ---------------------------------------------------------------------------
create table if not exists public.term_events (
  id text primary key,
  term_id text not null references public.terms(term_id) on delete cascade,
  event text not null check (event in ('created','promoted','retired','reactivated')),
  detail jsonb,
  at timestamptz not null default now()
);
create index if not exists term_events_term_idx on public.term_events (term_id, at desc);

-- ---------------------------------------------------------------------------
-- ingest_runs — one row per daily ingestion run. sources holds per-adapter
-- instrumentation (terms queried, observations written, quota units,
-- latency, failures, skip reason); ai_spend holds token counts and the
-- estimated dollar figure with its configured ceiling. A run that lost two
-- adapters still completes — the losses are recorded here, not fatal.
-- ---------------------------------------------------------------------------
create table if not exists public.ingest_runs (
  run_id text primary key,
  obs_date date not null,
  started_at timestamptz not null,
  finished_at timestamptz,
  sources jsonb not null default '{}'::jsonb,
  ai_spend jsonb,
  cascade_counts jsonb,
  z_distributions jsonb,
  terms_active integer,
  candidates_added integer not null default 0,
  candidates_retired integer not null default 0,
  notes text
);
create index if not exists ingest_runs_date_idx on public.ingest_runs (obs_date desc);

-- ---------------------------------------------------------------------------
-- quota_ledger — per-source, per-day platform quota spend. The scheduler
-- checks this BEFORE spending and hard-stops before the platform cap
-- (YouTube: 10,000 units/day, one search = 100 units).
-- ---------------------------------------------------------------------------
create table if not exists public.quota_ledger (
  id text primary key,
  source text not null,
  quota_date date not null,
  units_spent numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (source, quota_date)
);

-- RLS: same posture as the rest of the schema — public read, service writes.
alter table public.terms enable row level security;
alter table public.term_observations enable row level security;
alter table public.term_scores enable row level security;
alter table public.term_composites enable row level security;
alter table public.term_events enable row level security;
alter table public.ingest_runs enable row level security;
alter table public.quota_ledger enable row level security;

do $$
declare t text;
begin
  foreach t in array array['terms','term_observations','term_scores',
    'term_composites','term_events','ingest_runs','quota_ledger']
  loop
    execute format(
      'drop policy if exists "public read %I" on public.%I;
       create policy "public read %I" on public.%I for select using (true);',
      t, t, t, t);
  end loop;
end $$;
