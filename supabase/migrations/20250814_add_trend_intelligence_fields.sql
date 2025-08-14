-- Add trend intelligence fields to trend_submissions table
-- This migration adds comprehensive trend intelligence tracking

-- First, add the new columns for universal intelligence
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS trend_velocity TEXT CHECK (trend_velocity IN ('just_starting', 'accelerating', 'peaking', 'declining', 'dead')),
ADD COLUMN IF NOT EXISTS platform_spread TEXT CHECK (platform_spread IN ('single_platform', 'cross_platform', 'platform_wars')),
ADD COLUMN IF NOT EXISTS trend_size TEXT CHECK (trend_size IN ('under_10k', '10k_100k', '100k_1m', '1m_10m', 'over_10m')),
ADD COLUMN IF NOT EXISTS ai_origin TEXT CHECK (ai_origin IN ('definitely_human', 'likely_human', 'mixed', 'likely_ai', 'definitely_ai', 'deceptive_ai')),
ADD COLUMN IF NOT EXISTS ai_reasoning TEXT,
ADD COLUMN IF NOT EXISTS audience_sentiment TEXT CHECK (audience_sentiment IN ('love_it', 'mixed_fighting', 'hate_it')),
ADD COLUMN IF NOT EXISTS audience_demographics TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS audience_subcultures TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS brand_presence TEXT CHECK (brand_presence IN ('no_brands', 'indies_testing', 'majors_arriving', 'oversaturated')),
ADD COLUMN IF NOT EXISTS trend_title TEXT,
ADD COLUMN IF NOT EXISTS why_it_matters TEXT,
ADD COLUMN IF NOT EXISTS trend_prediction TEXT;

-- Add category-specific JSONB field for dynamic questions
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS category_intelligence JSONB DEFAULT '{}';

-- Update the category enum to include new categories
DO $$ 
BEGIN
    -- Check if the new values already exist before adding
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'political' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'political';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'finance' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'finance';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fashion' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'fashion';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'meme' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'meme';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'gaming' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'gaming';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'lifestyle' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'lifestyle';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'health' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'health';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'music' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'music';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'brand' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'brand';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'social_cause' AND enumtypid = 'trend_category'::regtype) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'social_cause';
    END IF;
EXCEPTION
    WHEN duplicate_object THEN
        -- If the type doesn't exist or values already exist, ignore
        NULL;
END $$;

-- Create an index on the new fields for better query performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_intelligence 
ON public.trend_submissions(trend_velocity, platform_spread, trend_size, ai_origin, audience_sentiment);

-- Create index on category_intelligence JSONB field
CREATE INDEX IF NOT EXISTS idx_trend_submissions_category_intelligence 
ON public.trend_submissions USING gin(category_intelligence);

-- Add comment to explain the category_intelligence structure
COMMENT ON COLUMN public.trend_submissions.category_intelligence IS 
'Stores category-specific intelligence data as JSONB. Structure varies by category:
- Political: {ideologicalLeaning, pushers, geographicPatterns}
- Finance: {sophisticationLevel, scamProbability, targetAudience}
- Fashion: {aestheticType, pricePoint, longevityPrediction}
- Meme: {lifecycleStage, remixPotential, monetizationVisible}
- Gaming: {communityType, developerAwareness, competitiveImpact}
- Lifestyle: {adoptionBarrier, sustainabilityFactor, healthImpact}
- Health: {scientificBacking, medicalCommunityStance, riskLevel}
- Music: {genreBlend, artistType, viralMechanism}
- Brand: {brandStrategy, authenticityScore, backfirePotential}
- Social Cause: {movementStage, oppositionLevel, mainstreamPotential}';

-- Create a view for easier trend intelligence querying
CREATE OR REPLACE VIEW public.trend_intelligence_view AS
SELECT 
    ts.*,
    up.username AS spotter_username,
    up.username AS spotter_display_name,  -- Using username since display_name doesn't exist
    -- Calculate intelligence completeness score
    CASE 
        WHEN ts.trend_velocity IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.platform_spread IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.trend_size IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.ai_origin IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.audience_sentiment IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN array_length(ts.audience_demographics, 1) > 0 THEN 10 ELSE 0 
    END +
    CASE 
        WHEN array_length(ts.audience_subcultures, 1) > 0 THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.brand_presence IS NOT NULL THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.category_intelligence IS NOT NULL 
             AND ts.category_intelligence != '{}'::jsonb THEN 10 ELSE 0 
    END +
    CASE 
        WHEN ts.why_it_matters IS NOT NULL OR ts.trend_prediction IS NOT NULL THEN 10 ELSE 0 
    END AS intelligence_completeness_score
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id;

-- Grant permissions on the new view
GRANT SELECT ON public.trend_intelligence_view TO authenticated;
GRANT SELECT ON public.trend_intelligence_view TO anon;

-- Function to calculate trend intelligence value score
CREATE OR REPLACE FUNCTION calculate_trend_intelligence_value(
    p_trend_id UUID
) RETURNS INTEGER AS $$
DECLARE
    v_score INTEGER := 0;
    v_trend RECORD;
BEGIN
    SELECT * INTO v_trend FROM public.trend_submissions WHERE id = p_trend_id;
    
    -- Base score from universal intelligence
    IF v_trend.trend_velocity IN ('just_starting', 'accelerating') THEN
        v_score := v_score + 30;
    ELSIF v_trend.trend_velocity = 'peaking' THEN
        v_score := v_score + 20;
    ELSE
        v_score := v_score + 10;
    END IF;
    
    -- Platform spread bonus
    IF v_trend.platform_spread = 'cross_platform' THEN
        v_score := v_score + 20;
    ELSIF v_trend.platform_spread = 'platform_wars' THEN
        v_score := v_score + 25;
    END IF;
    
    -- Size bonus
    CASE v_trend.trend_size
        WHEN 'under_10k' THEN v_score := v_score + 25;  -- Early detection bonus
        WHEN '10k_100k' THEN v_score := v_score + 20;
        WHEN '100k_1m' THEN v_score := v_score + 15;
        ELSE v_score := v_score + 10;
    END CASE;
    
    -- AI detection bonus
    IF v_trend.ai_origin IN ('deceptive_ai', 'definitely_ai') AND v_trend.ai_reasoning IS NOT NULL THEN
        v_score := v_score + 15;  -- Valuable to identify AI-generated trends
    END IF;
    
    -- Category intelligence bonus
    IF v_trend.category_intelligence IS NOT NULL AND v_trend.category_intelligence != '{}'::jsonb THEN
        -- Count the number of keys in the JSONB object
        v_score := v_score + ((SELECT COUNT(*) FROM jsonb_object_keys(v_trend.category_intelligence)) * 5);
    END IF;
    
    -- Context bonus
    IF v_trend.why_it_matters IS NOT NULL AND LENGTH(v_trend.why_it_matters) > 50 THEN
        v_score := v_score + 10;
    END IF;
    
    IF v_trend.trend_prediction IS NOT NULL AND LENGTH(v_trend.trend_prediction) > 50 THEN
        v_score := v_score + 10;
    END IF;
    
    RETURN LEAST(v_score, 100);  -- Cap at 100
END;
$$ LANGUAGE plpgsql;

-- Update trigger to set trend_title from description if not provided
CREATE OR REPLACE FUNCTION set_trend_title()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.trend_title IS NULL AND NEW.description IS NOT NULL THEN
        NEW.trend_title := SUBSTRING(NEW.description FROM 1 FOR 100);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_trend_title_trigger
BEFORE INSERT OR UPDATE ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION set_trend_title();