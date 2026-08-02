-- 006 — Real trend imagery. hero_image_url is set by the pipeline to the
-- highest-engagement corpus item that carries usable media (a YouTube
-- thumbnail or a Reddit image) — the trend's actual content, not stock art.
-- Null falls back to the curated Unsplash set in the UI.
--
-- Rollback: alter table public.trends drop column if exists hero_image_url;

alter table public.trends
  add column if not exists hero_image_url text;
