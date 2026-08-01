-- Rollback for 002_trend_evidence.sql
drop trigger if exists trend_evidence_append_only on public.trend_evidence;
drop table if exists public.trend_evidence;
