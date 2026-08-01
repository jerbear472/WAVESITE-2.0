-- ============================================
-- WAVESIGHT 2.0 - CULTURAL INTELLIGENCE SCHEMA
-- "Bloomberg Terminal for Culture"
-- ============================================
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE platform_enum AS ENUM ('youtube', 'reddit', 'tiktok');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE category_enum AS ENUM (
    'music', 'gaming', 'entertainment', 'education', 'news',
    'sports', 'technology', 'lifestyle', 'fashion', 'food',
    'politics', 'finance', 'memes', 'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE moment_status AS ENUM ('emerging', 'rising', 'peaking', 'fading', 'stable');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE sentiment_enum AS ENUM ('positive', 'negative', 'neutral', 'mixed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE pipeline_status AS ENUM ('running', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- RAW SIGNALS TABLE
-- Every scraped post/video/thread lands here
-- ============================================

CREATE TABLE IF NOT EXISTS public.raw_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  platform platform_enum NOT NULL,
  platform_id TEXT NOT NULL,
  source_url TEXT NOT NULL,

  -- Content
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  thumbnail_url TEXT,

  -- Creator
  creator_id TEXT NOT NULL DEFAULT '',
  creator_name TEXT NOT NULL DEFAULT '',
  creator_followers INTEGER DEFAULT 0,

  -- Metrics at scrape time
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  engagement_rate REAL DEFAULT 0,

  -- Velocity
  views_per_hour REAL DEFAULT 0,
  age_hours REAL DEFAULT 0,

  -- Scores
  momentum_score REAL DEFAULT 0,
  velocity_score REAL DEFAULT 0,
  viral_potential REAL DEFAULT 0,

  -- Metadata
  category category_enum DEFAULT 'other',
  subreddit TEXT,
  hashtags TEXT[],

  -- Timestamps
  published_at TIMESTAMPTZ NOT NULL,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicates per platform
  UNIQUE(platform, platform_id)
);

-- ============================================
-- CULTURAL MOMENTS TABLE
-- AI-grouped trend clusters
-- ============================================

CREATE TABLE IF NOT EXISTS public.cultural_moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- AI-generated identity
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  why_it_matters TEXT DEFAULT '',

  -- Classification
  category category_enum DEFAULT 'other',
  sentiment sentiment_enum DEFAULT 'neutral',
  status moment_status DEFAULT 'emerging',

  -- Aggregated metrics
  momentum_score REAL DEFAULT 0,
  signal_count INTEGER DEFAULT 0,
  platform_breakdown JSONB DEFAULT '{}',
  total_engagement BIGINT DEFAULT 0,
  total_views BIGINT DEFAULT 0,

  -- Trajectory
  velocity REAL DEFAULT 0,
  acceleration REAL DEFAULT 0,
  predicted_peak TIMESTAMPTZ,

  -- Keywords
  keywords TEXT[] DEFAULT '{}',
  related_moments UUID[] DEFAULT '{}',

  -- Timestamps
  first_detected_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- MOMENT-SIGNAL JUNCTION TABLE
-- Links raw signals to cultural moments
-- ============================================

CREATE TABLE IF NOT EXISTS public.moment_signals (
  moment_id UUID NOT NULL REFERENCES public.cultural_moments(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES public.raw_signals(id) ON DELETE CASCADE,
  relevance_score REAL DEFAULT 0.5,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (moment_id, signal_id)
);

-- ============================================
-- MOMENT SNAPSHOTS - time-series tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.moment_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES public.cultural_moments(id) ON DELETE CASCADE,
  momentum_score REAL DEFAULT 0,
  signal_count INTEGER DEFAULT 0,
  total_views BIGINT DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  velocity REAL DEFAULT 0,
  status moment_status DEFAULT 'emerging',
  captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PIPELINE RUNS - audit trail
-- ============================================

CREATE TABLE IF NOT EXISTS public.pipeline_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  signals_scraped INTEGER DEFAULT 0,
  moments_created INTEGER DEFAULT 0,
  moments_updated INTEGER DEFAULT 0,
  errors TEXT[] DEFAULT '{}',
  status pipeline_status DEFAULT 'running'
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_raw_signals_platform ON public.raw_signals(platform);
CREATE INDEX IF NOT EXISTS idx_raw_signals_scraped_at ON public.raw_signals(scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_raw_signals_momentum ON public.raw_signals(momentum_score DESC);
CREATE INDEX IF NOT EXISTS idx_raw_signals_category ON public.raw_signals(category);
CREATE INDEX IF NOT EXISTS idx_raw_signals_published_at ON public.raw_signals(published_at DESC);

CREATE INDEX IF NOT EXISTS idx_cultural_moments_status ON public.cultural_moments(status);
CREATE INDEX IF NOT EXISTS idx_cultural_moments_momentum ON public.cultural_moments(momentum_score DESC);
CREATE INDEX IF NOT EXISTS idx_cultural_moments_category ON public.cultural_moments(category);
CREATE INDEX IF NOT EXISTS idx_cultural_moments_updated ON public.cultural_moments(last_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_moment_signals_moment ON public.moment_signals(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_signals_signal ON public.moment_signals(signal_id);

CREATE INDEX IF NOT EXISTS idx_moment_snapshots_moment ON public.moment_snapshots(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_snapshots_captured ON public.moment_snapshots(captured_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update last_updated_at on cultural_moments
CREATE OR REPLACE FUNCTION update_moment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_cultural_moments_timestamp ON public.cultural_moments;
CREATE TRIGGER update_cultural_moments_timestamp
  BEFORE UPDATE ON public.cultural_moments
  FOR EACH ROW
  EXECUTE FUNCTION update_moment_timestamp();

-- ============================================
-- ROW LEVEL SECURITY
-- For now, public read access (no auth required for dashboard)
-- ============================================

ALTER TABLE public.raw_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cultural_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moment_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read raw_signals" ON public.raw_signals FOR SELECT USING (true);
CREATE POLICY "Public read cultural_moments" ON public.cultural_moments FOR SELECT USING (true);
CREATE POLICY "Public read moment_signals" ON public.moment_signals FOR SELECT USING (true);
CREATE POLICY "Public read moment_snapshots" ON public.moment_snapshots FOR SELECT USING (true);
CREATE POLICY "Public read pipeline_runs" ON public.pipeline_runs FOR SELECT USING (true);

-- Service role write access (for the pipeline)
CREATE POLICY "Service write raw_signals" ON public.raw_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write cultural_moments" ON public.cultural_moments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write moment_signals" ON public.moment_signals FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write moment_snapshots" ON public.moment_snapshots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service write pipeline_runs" ON public.pipeline_runs FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- GRANTS
-- ============================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
