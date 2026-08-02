-- 005 — Bottom-up discovery: the sweep corpus and the detection queue.
-- 'sweep' items come from a broad roster of culture subreddits and YouTube
-- trending categories with NO trend-name filtering — the firehose the
-- detector reads. detected_clusters is the birth record of every trend the
-- system finds on its own: the spiking phrases, the actual items behind
-- them, and what became of the cluster (named into a trend / dismissed).
--
-- Reversible: see 005_sweep_detect_rollback.sql

-- raw_items.corpus gains 'sweep'. The auto-named check constraint from 004:
alter table public.raw_items
  drop constraint if exists raw_items_corpus_check;
alter table public.raw_items
  add constraint raw_items_corpus_check
  check (corpus in ('trend','baseline','sweep'));

create table if not exists public.detected_clusters (
  id text primary key,
  run_id text,
  phrases jsonb not null,
  item_ids jsonb not null,
  item_count integer not null,
  author_count integer not null,
  container_count integer not null,
  novelty numeric,
  score numeric,
  status text not null default 'new'
    check (status in ('new','named','dismissed')),
  trend_id text references public.trends(id) on delete set null,
  detected_at timestamptz not null default now()
);
create index if not exists detected_clusters_time_idx
  on public.detected_clusters (detected_at desc);

alter table public.detected_clusters enable row level security;
drop policy if exists "public read detected_clusters" on public.detected_clusters;
create policy "public read detected_clusters"
  on public.detected_clusters for select using (true);
