-- Add enhanced tracking fields for demographic and finance data
-- This migration adds columns needed for the enhanced scroll page

-- Add platform column if not exists
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add engagement score column
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS engagement_score NUMERIC(3,1) DEFAULT 0 CHECK (engagement_score >= 0 AND engagement_score <= 10);

-- Add demographic data as JSONB for flexibility
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS demographic_data JSONB DEFAULT '{}';

-- Add finance data as JSONB for flexibility  
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS finance_data JSONB DEFAULT null;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_platform ON public.trend_submissions(platform);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_engagement_score ON public.trend_submissions(engagement_score);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_demographic_data ON public.trend_submissions USING gin(demographic_data);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_finance_data ON public.trend_submissions USING gin(finance_data);

-- Add finance-specific category values if not exists
DO $$ 
BEGIN
    -- Check if the types don't exist and add them
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'meme_stocks' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'trend_category'
        )
    ) THEN
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'meme_stocks';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'crypto';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'forex';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'options';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'day_trading';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'wallstreetbets';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'penny_stocks';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'defi';
        ALTER TYPE trend_category ADD VALUE IF NOT EXISTS 'nft';
    END IF;
END $$;

-- Sample query to get finance trends
-- SELECT * FROM trend_submissions 
-- WHERE finance_data IS NOT NULL 
-- AND finance_data->>'tickers' IS NOT NULL;

-- Sample query to get demographic insights
-- SELECT 
--   demographic_data->>'age_ranges' as age_groups,
--   COUNT(*) as trend_count,
--   AVG(engagement_score) as avg_engagement
-- FROM trend_submissions
-- WHERE demographic_data IS NOT NULL
-- GROUP BY demographic_data->>'age_ranges';

COMMENT ON COLUMN public.trend_submissions.platform IS 'Social media platform where trend was spotted';
COMMENT ON COLUMN public.trend_submissions.engagement_score IS 'Calculated engagement score (0-10)';
COMMENT ON COLUMN public.trend_submissions.demographic_data IS 'JSON data containing age ranges, genders, locations, interests';
COMMENT ON COLUMN public.trend_submissions.finance_data IS 'JSON data containing tickers, sentiment, volume for finance trends';