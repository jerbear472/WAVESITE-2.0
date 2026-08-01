-- Rollback for 003_forecasts.sql
drop trigger if exists forecast_resolution_log_append_only on public.forecast_resolution_log;
drop table if exists public.forecast_resolution_log;
drop trigger if exists forecasts_guard on public.forecasts;
drop function if exists public.forecasts_guard();
drop table if exists public.forecasts;
