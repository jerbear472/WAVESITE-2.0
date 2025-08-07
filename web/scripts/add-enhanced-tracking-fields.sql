-- Add enhanced tracking fields to trend_submissions table
-- Safe to run multiple times - only adds columns if they don't exist

-- Add engagement and virality tracking
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS engagement_score INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50;

-- Add demographic data as JSONB
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS demographic_data JSONB;

-- Add finance data as JSONB
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS finance_data JSONB;

-- Ensure payment_amount exists
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,4) DEFAULT 0.08;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_engagement_score ON public.trend_submissions(engagement_score);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_wave_score ON public.trend_submissions(wave_score);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_demographic_data ON public.trend_submissions USING GIN(demographic_data);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_finance_data ON public.trend_submissions USING GIN(finance_data);

-- Add comment for documentation
COMMENT ON COLUMN public.trend_submissions.demographic_data IS 'JSON object containing age_ranges, subcultures, region, moods';
COMMENT ON COLUMN public.trend_submissions.finance_data IS 'JSON object containing tickers, sentiment, categories for finance-related trends';
COMMENT ON COLUMN public.trend_submissions.engagement_score IS 'Calculated engagement score 1-10 based on likes/comments/shares/views ratios';
COMMENT ON COLUMN public.trend_submissions.wave_score IS 'Wave trend score 0-100 indicating trend strength';