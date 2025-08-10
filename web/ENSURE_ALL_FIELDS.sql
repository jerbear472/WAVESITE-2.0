-- Ensure all required fields exist for thumbnail and wave score functionality
-- Safe to run multiple times

-- First ensure social media columns
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS screenshot_url TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add wave score column
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50;

-- Add trend velocity column
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS trend_velocity TEXT;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_thumbnail_url ON public.trend_submissions(thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_wave_score ON public.trend_submissions(wave_score);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_post_url ON public.trend_submissions(post_url);

-- Add comments for documentation
COMMENT ON COLUMN public.trend_submissions.thumbnail_url IS 'Auto-captured thumbnail URL from social media post';
COMMENT ON COLUMN public.trend_submissions.wave_score IS 'Wave trend score 0-10 indicating trend strength';
COMMENT ON COLUMN public.trend_submissions.trend_velocity IS 'Trend growth velocity: just_starting, picking_up, viral, peaked, declining';

-- Verify columns exist
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('thumbnail_url', 'wave_score', 'trend_velocity', 'post_url', 'screenshot_url')
ORDER BY column_name;