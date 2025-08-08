-- AI Schema Extensions for WaveSight
-- Version: 1.0
-- Date: 2025-08-08
-- Purpose: Extend existing tables with AI capabilities without breaking current data

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- SECTION 1: Extend existing trend_submissions table
-- ============================================

-- Add AI columns to trend_submissions for raw processing
ALTER TABLE public.trend_submissions
  ADD COLUMN IF NOT EXISTS classification JSONB,
  ADD COLUMN IF NOT EXISTS entities JSONB,
  ADD COLUMN IF NOT EXISTS vector vector(1536),
  ADD COLUMN IF NOT EXISTS clustered BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cluster_id UUID,
  ADD COLUMN IF NOT EXISTS geo_location JSONB,
  ADD COLUMN IF NOT EXISTS persona_id UUID;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_vector ON public.trend_submissions 
  USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_clustered ON public.trend_submissions(clustered);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_cluster_id ON public.trend_submissions(cluster_id);

-- ============================================
-- SECTION 2: Create deduplicated trends table (trend tiles)
-- ============================================

CREATE TABLE IF NOT EXISTS public.trends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_text TEXT NOT NULL,
  representative_submission_id UUID REFERENCES public.trend_submissions(id),
  first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submission_count INTEGER DEFAULT 1,
  persona_diversity FLOAT DEFAULT 0.0,
  geo_spread FLOAT DEFAULT 0.0,
  vector vector(1536),
  category VARCHAR(100),
  entities JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for trends table
CREATE INDEX IF NOT EXISTS idx_trends_vector ON public.trends 
  USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_trends_first_seen ON public.trends(first_seen);
CREATE INDEX IF NOT EXISTS idx_trends_last_seen ON public.trends(last_seen);
CREATE INDEX IF NOT EXISTS idx_trends_submission_count ON public.trends(submission_count);
CREATE INDEX IF NOT EXISTS idx_trends_category ON public.trends(category);

-- ============================================
-- SECTION 3: Create trend scores table
-- ============================================

CREATE TABLE IF NOT EXISTS public.trend_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  virality_index FLOAT NOT NULL DEFAULT 0.0,
  early_adoption_bonus FLOAT NOT NULL DEFAULT 1.0,
  velocity FLOAT NOT NULL DEFAULT 0.0,
  momentum_score FLOAT NOT NULL DEFAULT 0.0,
  total_score FLOAT NOT NULL DEFAULT 0.0,
  scoring_metadata JSONB DEFAULT '{}',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for trend scores
CREATE INDEX IF NOT EXISTS idx_trend_scores_trend_time ON public.trend_scores(trend_id, calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_scores_total ON public.trend_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_trend_scores_calculated_at ON public.trend_scores(calculated_at DESC);

-- ============================================
-- SECTION 4: Create trend predictions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.trend_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  days_to_mainstream INTEGER NOT NULL,
  mainstream_probability FLOAT NOT NULL DEFAULT 0.0,
  peak_date TIMESTAMP WITH TIME ZONE,
  decline_date TIMESTAMP WITH TIME ZONE,
  lifecycle_stage VARCHAR(50) DEFAULT 'emerging',
  prediction_confidence FLOAT NOT NULL DEFAULT 0.0,
  prediction_metadata JSONB DEFAULT '{}',
  predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for trend predictions
CREATE INDEX IF NOT EXISTS idx_trend_predictions_trend_time ON public.trend_predictions(trend_id, predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_predictions_mainstream ON public.trend_predictions(days_to_mainstream);
CREATE INDEX IF NOT EXISTS idx_trend_predictions_stage ON public.trend_predictions(lifecycle_stage);

-- ============================================
-- SECTION 5: Create submission to trend mapping
-- ============================================

CREATE TABLE IF NOT EXISTS public.submission_trend_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.trends(id) ON DELETE CASCADE,
  similarity_score FLOAT NOT NULL DEFAULT 0.0,
  mapped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(submission_id, trend_id)
);

-- Create indexes for mapping table
CREATE INDEX IF NOT EXISTS idx_submission_trend_map_submission ON public.submission_trend_map(submission_id);
CREATE INDEX IF NOT EXISTS idx_submission_trend_map_trend ON public.submission_trend_map(trend_id);

-- ============================================
-- SECTION 6: Create persona clusters table
-- ============================================

CREATE TABLE IF NOT EXISTS public.persona_clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  characteristics JSONB NOT NULL DEFAULT '{}',
  size INTEGER DEFAULT 0,
  trend_affinity FLOAT DEFAULT 0.0,
  is_mainstream BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user to persona mapping
CREATE TABLE IF NOT EXISTS public.user_persona_map (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  persona_cluster_id UUID NOT NULL REFERENCES public.persona_clusters(id) ON DELETE CASCADE,
  confidence FLOAT DEFAULT 0.0,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- SECTION 7: Create regions table
-- ============================================

CREATE TABLE IF NOT EXISTS public.regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  country VARCHAR(100),
  state_province VARCHAR(100),
  city VARCHAR(100),
  coordinates JSONB,
  timezone VARCHAR(50),
  population INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- SECTION 8: Create background job tracking
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'running',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_job_runs_name_time ON public.ai_job_runs(job_name, started_at DESC);

-- ============================================
-- SECTION 9: Helper functions for diversity calculations
-- ============================================

-- Function to calculate persona diversity for a trend
CREATE OR REPLACE FUNCTION calculate_persona_diversity(trend_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
  diversity FLOAT;
BEGIN
  WITH persona_counts AS (
    SELECT COUNT(DISTINCT upm.persona_cluster_id) AS unique_personas,
           COUNT(*) AS total_submissions
    FROM submission_trend_map stm
    JOIN trend_submissions ts ON ts.id = stm.submission_id
    LEFT JOIN user_persona_map upm ON upm.user_id = ts.spotter_id
    WHERE stm.trend_id = trend_uuid
  ),
  total_personas AS (
    SELECT COUNT(*) AS total FROM persona_clusters
  )
  SELECT 
    CASE 
      WHEN tp.total = 0 THEN 0
      ELSE COALESCE(pc.unique_personas::FLOAT / tp.total, 0)
    END INTO diversity
  FROM persona_counts pc, total_personas tp;
  
  RETURN COALESCE(diversity, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate geographic spread for a trend
CREATE OR REPLACE FUNCTION calculate_geo_spread(trend_uuid UUID)
RETURNS FLOAT AS $$
DECLARE
  spread FLOAT;
BEGIN
  WITH geo_counts AS (
    SELECT COUNT(DISTINCT ts.geo_location->>'region') AS unique_regions,
           COUNT(*) AS total_submissions
    FROM submission_trend_map stm
    JOIN trend_submissions ts ON ts.id = stm.submission_id
    WHERE stm.trend_id = trend_uuid
      AND ts.geo_location IS NOT NULL
  ),
  total_regions AS (
    SELECT COUNT(*) AS total FROM regions
  )
  SELECT 
    CASE 
      WHEN tr.total = 0 THEN 0
      ELSE COALESCE(gc.unique_regions::FLOAT / tr.total, 0)
    END INTO spread
  FROM geo_counts gc, total_regions tr;
  
  RETURN COALESCE(spread, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to check if a trend is niche (less than 20% mainstream personas)
CREATE OR REPLACE FUNCTION is_trend_niche(trend_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  mainstream_ratio FLOAT;
BEGIN
  WITH persona_stats AS (
    SELECT 
      COUNT(*) FILTER (WHERE pc.is_mainstream = true) AS mainstream_count,
      COUNT(*) AS total_count
    FROM submission_trend_map stm
    JOIN trend_submissions ts ON ts.id = stm.submission_id
    LEFT JOIN user_persona_map upm ON upm.user_id = ts.spotter_id
    LEFT JOIN persona_clusters pc ON pc.id = upm.persona_cluster_id
    WHERE stm.trend_id = trend_uuid
  )
  SELECT 
    CASE 
      WHEN total_count = 0 THEN 0
      ELSE mainstream_count::FLOAT / total_count
    END INTO mainstream_ratio
  FROM persona_stats;
  
  RETURN mainstream_ratio < 0.2;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 10: Vector search function
-- ============================================

CREATE OR REPLACE FUNCTION vector_search_trends(
  query_vector vector(1536),
  match_threshold FLOAT DEFAULT 0.85,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE(
  trend_id UUID,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS trend_id,
    1 - (t.vector <=> query_vector) AS similarity
  FROM trends t
  WHERE t.vector IS NOT NULL
    AND 1 - (t.vector <=> query_vector) > match_threshold
  ORDER BY t.vector <=> query_vector
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECTION 11: Enable RLS on new tables
-- ============================================

ALTER TABLE public.trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trend_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_trend_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.persona_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_persona_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_job_runs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Trends are viewable by authenticated users"
  ON public.trends FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Trend scores are viewable by authenticated users"
  ON public.trend_scores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Trend predictions are viewable by authenticated users"
  ON public.trend_predictions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view their persona assignment"
  ON public.user_persona_map FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================
-- SECTION 12: Insert default persona clusters
-- ============================================

INSERT INTO public.persona_clusters (name, description, characteristics, is_mainstream) VALUES
('Early Adopters', 'First to try new trends, high risk tolerance', '{"age_range": "18-35", "tech_savvy": true, "influence": "high"}', false),
('Tech Enthusiasts', 'Technology and gadget focused', '{"interests": ["technology", "gaming", "crypto"], "adoption_speed": "fast"}', false),
('Fashion Forward', 'Style and fashion trendsetters', '{"interests": ["fashion", "beauty", "lifestyle"], "social_media": "very_active"}', false),
('Mainstream Users', 'General population, follows established trends', '{"adoption_speed": "slow", "risk_tolerance": "low"}', true),
('Late Majority', 'Adopts trends only when widely accepted', '{"adoption_speed": "very_slow", "influence": "low"}', true),
('Gen Z Creators', 'Young content creators and influencers', '{"age_range": "16-24", "platform": ["tiktok", "instagram"], "content_creation": true}', false),
('Millennial Professionals', 'Career-focused millennials', '{"age_range": "28-42", "income": "middle_to_high", "interests": ["career", "wellness"]}', true),
('Suburban Families', 'Family-oriented suburban demographics', '{"family_status": "parents", "location": "suburban", "interests": ["family", "home"]}', true)
ON CONFLICT DO NOTHING;

-- ============================================
-- SECTION 13: Insert sample regions
-- ============================================

INSERT INTO public.regions (code, name, country, state_province, city) VALUES
('US-NYC', 'New York City', 'United States', 'New York', 'New York City'),
('US-LA', 'Los Angeles', 'United States', 'California', 'Los Angeles'),
('US-CHI', 'Chicago', 'United States', 'Illinois', 'Chicago'),
('UK-LON', 'London', 'United Kingdom', 'England', 'London'),
('JP-TKY', 'Tokyo', 'Japan', 'Tokyo', 'Tokyo'),
('DE-BER', 'Berlin', 'Germany', 'Berlin', 'Berlin'),
('BR-SAO', 'São Paulo', 'Brazil', 'São Paulo', 'São Paulo'),
('FR-PAR', 'Paris', 'France', 'Île-de-France', 'Paris'),
('AU-SYD', 'Sydney', 'Australia', 'New South Wales', 'Sydney'),
('CA-TOR', 'Toronto', 'Canada', 'Ontario', 'Toronto')
ON CONFLICT DO NOTHING;