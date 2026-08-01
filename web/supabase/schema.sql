-- WaveSight — Supabase schema
-- Run in the Supabase SQL editor (or `supabase db push`). The app works without
-- this (seeded mock mode); apply it when you're ready to persist real data.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  user_type text not null default 'creator'
    check (user_type in ('creator','marketer','agency','artist','brand','admin')),
  company text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- signals
-- ---------------------------------------------------------------------------
create table if not exists public.signals (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'manual'
    check (source in ('youtube','tiktok','reddit','instagram','article','manual','google_trends','other')),
  url text,
  title text,
  text text,
  creator_name text,
  platform_engagement_json jsonb,
  raw_metadata_json jsonb,
  detected_phrases text[] not null default '{}',
  detected_entities text[] not null default '{}',
  detected_emotions text[] not null default '{}',
  submitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  ingested_at timestamptz
);

-- ---------------------------------------------------------------------------
-- trends
-- ---------------------------------------------------------------------------
create table if not exists public.trends (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  one_line_summary text not null,
  detailed_summary text not null default '',
  category text not null default '',
  emotional_tone text not null default '',
  audience text not null default '',
  lifecycle_stage text not null default 'emerging'
    check (lifecycle_stage in ('emerging','accelerating','peaking','saturated','declining','resurfacing')),
  virality_type text not null default 'other'
    check (virality_type in ('meme','aesthetic','challenge','phrase','product_behavior','sound','format','backlash','recommendation_loop','identity_signal','other')),
  wavescore integer not null default 0,
  momentum_score integer not null default 0,
  sentiment_score integer not null default 0,
  brand_safety_score integer not null default 0,
  saturation_score integer not null default 0,
  commercial_relevance_score integer not null default 0,
  participation_difficulty text not null default 'medium'
    check (participation_difficulty in ('easy','medium','hard')),
  risk_level text not null default 'low'
    check (risk_level in ('low','medium','high')),
  why_spreading text not null default '',
  who_should_join text not null default '',
  who_should_avoid text not null default '',
  best_platforms text[] not null default '{}',
  creative_angles text[] not null default '{}',
  sample_hooks text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trends_wavescore_idx on public.trends (wavescore desc);
create index if not exists trends_lifecycle_idx on public.trends (lifecycle_stage);

-- ---------------------------------------------------------------------------
-- trend_signals (join)
-- ---------------------------------------------------------------------------
create table if not exists public.trend_signals (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trends(id) on delete cascade,
  signal_id uuid not null references public.signals(id) on delete cascade,
  relevance_score integer not null default 80,
  created_at timestamptz not null default now(),
  unique (trend_id, signal_id)
);

-- ---------------------------------------------------------------------------
-- creative_briefs
-- ---------------------------------------------------------------------------
create table if not exists public.creative_briefs (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trends(id) on delete cascade,
  user_type text not null
    check (user_type in ('creator','marketer','agency','artist','brand','admin')),
  target_audience text,
  brand_or_creator_description text,
  recommendation text not null default '',
  hooks text[] not null default '{}',
  post_formats text[] not null default '{}',
  do_this text[] not null default '{}',
  avoid_this text[] not null default '{}',
  risk_notes text,
  suggested_caption text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- saved_trends
-- ---------------------------------------------------------------------------
create table if not exists public.saved_trends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  trend_id uuid not null references public.trends(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, trend_id)
);

-- ---------------------------------------------------------------------------
-- daily_reports
-- ---------------------------------------------------------------------------
create table if not exists public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  report_date date not null unique,
  title text not null,
  summary text not null default '',
  top_trend_ids uuid[] not null default '{}',
  generated_report text not null default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Row Level Security
--   Trends, signals, trend_signals, and daily_reports are public-readable
--   (intelligence everyone in the workspace can see). Saved trends are private
--   to the owning user. Tighten these for your own auth model.
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.signals enable row level security;
alter table public.trends enable row level security;
alter table public.trend_signals enable row level security;
alter table public.creative_briefs enable row level security;
alter table public.saved_trends enable row level security;
alter table public.daily_reports enable row level security;

do $$
begin
  -- Public read for the shared intelligence tables.
  if not exists (select 1 from pg_policies where policyname = 'trends_read') then
    create policy "trends_read" on public.trends for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'signals_read') then
    create policy "signals_read" on public.signals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'trend_signals_read') then
    create policy "trend_signals_read" on public.trend_signals for select using (true);
  end if;
  if not exists (select 1 from pg_policies where policyname = 'reports_read') then
    create policy "reports_read" on public.daily_reports for select using (true);
  end if;

  -- Saved trends are private to the owner.
  if not exists (select 1 from pg_policies where policyname = 'saved_own') then
    create policy "saved_own" on public.saved_trends
      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;

  -- Profiles: a user can read/update their own row.
  if not exists (select 1 from pg_policies where policyname = 'profiles_self') then
    create policy "profiles_self" on public.profiles
      for all using (auth.uid() = id) with check (auth.uid() = id);
  end if;
end $$;
