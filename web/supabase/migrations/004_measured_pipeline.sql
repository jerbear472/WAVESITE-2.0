-- 004 — The measured pipeline: collection separated from scoring.
-- raw_items is the corpus: every individual item fetched from a real platform
-- connector, persisted BEFORE any scoring, including an unfiltered baseline
-- sample. All metrics downstream must be reproducible from these rows alone.
--
-- Reversible: see 004_measured_pipeline_rollback.sql

-- ---------------------------------------------------------------------------
-- raw_items — one row per fetched platform item. Append-only: this is the raw
-- material of every published number; rewriting it rewrites history.
-- corpus 'trend'    = fetched by a trend-term query
-- corpus 'baseline' = sampled with NO trend filtering (the control)
-- author_meta captures follower/subscriber context AT CAPTURE TIME so
-- saturation stays reproducible even as live counts drift.
-- ---------------------------------------------------------------------------
create table if not exists public.raw_items (
  id text primary key,
  source text not null check (source in ('reddit','youtube')),
  platform text not null,
  corpus text not null check (corpus in ('trend','baseline')),
  query text not null default '',
  source_url text not null,
  author_handle text,
  author_id text,
  container text,
  posted_at timestamptz not null,
  captured_at timestamptz not null default now(),
  title text,
  text text,
  engagement jsonb,
  author_meta jsonb,
  media_refs jsonb
);

create index if not exists raw_items_corpus_posted_idx
  on public.raw_items (corpus, posted_at desc);
create index if not exists raw_items_query_idx on public.raw_items (query);
create index if not exists raw_items_source_idx on public.raw_items (source);

drop trigger if exists raw_items_append_only on public.raw_items;
create trigger raw_items_append_only
  before update or delete on public.raw_items
  for each row execute function public.reject_mutation();

-- ---------------------------------------------------------------------------
-- item_trend_links — entity resolution output. An item may support several
-- trends. matched_by records HOW the link was made (fuzzy code, model
-- escalation, or a human merge action); links are derived data and mutable.
-- ---------------------------------------------------------------------------
create table if not exists public.item_trend_links (
  item_id text not null references public.raw_items(id) on delete cascade,
  trend_id text not null references public.trends(id) on delete cascade,
  matched_by text not null check (matched_by in ('fuzzy','model','manual')),
  confidence numeric,
  created_at timestamptz not null default now(),
  primary key (item_id, trend_id)
);
create index if not exists item_trend_links_trend_idx
  on public.item_trend_links (trend_id);

-- ---------------------------------------------------------------------------
-- item_annotations — per-item model classifications (sentiment). Kept apart
-- from raw_items so the corpus stays append-only while annotations can be
-- re-run with a newer model.
-- ---------------------------------------------------------------------------
create table if not exists public.item_annotations (
  item_id text primary key references public.raw_items(id) on delete cascade,
  sentiment text check (sentiment in ('positive','neutral','negative','ironic')),
  model text,
  classified_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- trend_metrics — one row per trend per measured run: the computed raw
-- metrics AND their percentile normalizations, side by side. Raw values are
-- never discarded: the 95th percentile has to stay explainable as "400 posts".
-- ---------------------------------------------------------------------------
create table if not exists public.trend_metrics (
  id text primary key,
  run_id text not null,
  trend_id text not null references public.trends(id) on delete cascade,
  window_start timestamptz not null,
  window_end timestamptz not null,
  raw jsonb not null,
  percentiles jsonb not null,
  state text check (state in ('in_sync','rising','warming','fading')),
  provisional boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists trend_metrics_run_idx on public.trend_metrics (run_id);
create index if not exists trend_metrics_trend_idx
  on public.trend_metrics (trend_id, created_at desc);

-- ---------------------------------------------------------------------------
-- metric_history — the rolling reference distribution, one row per
-- (run, trend, metric). Percentile ranks are computed against the trailing
-- 90 days of this table, across ALL trends — a fixed reference scale, never
-- per-run min/max.
-- ---------------------------------------------------------------------------
create table if not exists public.metric_history (
  id text primary key,
  metric text not null,
  raw_value numeric not null,
  trend_id text not null,
  run_id text not null,
  recorded_at timestamptz not null default now()
);
create index if not exists metric_history_metric_time_idx
  on public.metric_history (metric, recorded_at desc);

-- ---------------------------------------------------------------------------
-- run_distributions — instrumentation. After every measured run, the shape of
-- each metric's distribution is logged so compression shows up in data, not
-- in screenshots.
-- ---------------------------------------------------------------------------
create table if not exists public.run_distributions (
  id text primary key,
  run_id text not null,
  metric text not null,
  stats jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists run_distributions_run_idx
  on public.run_distributions (run_id);

-- ---------------------------------------------------------------------------
-- pipeline_config — tunable thresholds (state bands etc.) without a deploy.
-- ---------------------------------------------------------------------------
create table if not exists public.pipeline_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS: same posture as the rest of the schema — public read, service writes.
alter table public.raw_items enable row level security;
alter table public.item_trend_links enable row level security;
alter table public.item_annotations enable row level security;
alter table public.trend_metrics enable row level security;
alter table public.metric_history enable row level security;
alter table public.run_distributions enable row level security;
alter table public.pipeline_config enable row level security;

do $$
declare t text;
begin
  foreach t in array array['raw_items','item_trend_links','item_annotations',
    'trend_metrics','metric_history','run_distributions','pipeline_config']
  loop
    execute format(
      'drop policy if exists "public read %I" on public.%I;
       create policy "public read %I" on public.%I for select using (true);',
      t, t, t, t);
  end loop;
end $$;
