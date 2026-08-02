-- Rollback for 007_term_signals.sql — drops the term signals layer.
-- Order matters: children before terms.

drop table if exists public.quota_ledger;
drop table if exists public.ingest_runs;
drop table if exists public.term_events;
drop table if exists public.term_composites;
drop table if exists public.term_scores;
drop table if exists public.term_observations;
drop table if exists public.terms;
