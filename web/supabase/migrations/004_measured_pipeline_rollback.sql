-- Rollback for 004 — drops the measured-pipeline tables. The raw corpus is
-- lost on rollback; export raw_items first if the data matters.

drop table if exists public.run_distributions;
drop table if exists public.metric_history;
drop table if exists public.trend_metrics;
drop table if exists public.item_annotations;
drop table if exists public.item_trend_links;
drop table if exists public.raw_items;
drop table if exists public.pipeline_config;
