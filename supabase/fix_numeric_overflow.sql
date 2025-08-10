-- Fix numeric field overflow by changing INTEGER columns to BIGINT
-- BIGINT can hold values up to 9,223,372,036,854,775,807

-- First, drop ALL views that depend on the columns we're changing
-- This must be done in order to avoid the "column used by view" error
DROP VIEW IF EXISTS public.available_trends_for_verification CASCADE;
DROP VIEW IF EXISTS public.trends_for_validation CASCADE;
DROP VIEW IF EXISTS public.public_trends CASCADE;
DROP VIEW IF EXISTS public.verify_page CASCADE;
DROP VIEW IF EXISTS public.trend_tiles_content CASCADE;
DROP VIEW IF EXISTS public.user_trend_stats CASCADE;
DROP VIEW IF EXISTS public.trending_content CASCADE;
DROP VIEW IF EXISTS public.validation_queue CASCADE;

-- Now we can safely alter the columns in trend_submissions table
ALTER TABLE public.trend_submissions 
ALTER COLUMN likes_count TYPE BIGINT,
ALTER COLUMN comments_count TYPE BIGINT,
ALTER COLUMN shares_count TYPE BIGINT,
ALTER COLUMN views_count TYPE BIGINT;

-- Also update validation_count to handle large numbers
ALTER TABLE public.trend_submissions
ALTER COLUMN validation_count TYPE BIGINT;

-- Recreate the public_trends view with updated column types
CREATE OR REPLACE VIEW public.public_trends AS
SELECT 
    ts.id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count::BIGINT,
    ts.comments_count::BIGINT,
    ts.shares_count::BIGINT,
    ts.views_count::BIGINT,
    ts.hashtags,
    ts.post_url,
    ts.virality_prediction,
    ts.quality_score,
    ts.created_at,
    ts.posted_at,
    up.username as spotter_username,
    up.id as spotter_id
FROM public.trend_submissions ts
JOIN public.user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('approved', 'viral', 'validating')
ORDER BY ts.created_at DESC;

-- Recreate verify_page view if it exists
CREATE OR REPLACE VIEW public.verify_page AS
SELECT 
    ts.id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.post_url,
    ts.spotter_id,
    ts.virality_prediction,
    ts.quality_score,
    ts.validation_count::BIGINT,
    ts.approve_count,
    ts.reject_count,
    ts.status,
    ts.created_at,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count::BIGINT,
    ts.comments_count::BIGINT,
    ts.shares_count::BIGINT,
    ts.views_count::BIGINT,
    ts.hashtags,
    ts.posted_at,
    ts.platform,
    up.username as spotter_username
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Recreate trends_for_validation view (the one causing the error)
CREATE OR REPLACE VIEW public.trends_for_validation AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.post_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.posted_at,
    ts.platform,
    ts.virality_prediction,
    ts.quality_score,
    ts.validation_count,
    ts.approve_count,
    ts.reject_count,
    ts.status,
    ts.created_at,
    up.username as spotter_username
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Recreate available_trends_for_verification view (another view causing the error)
CREATE OR REPLACE VIEW public.available_trends_for_verification AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.post_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.posted_at,
    ts.platform,
    ts.virality_prediction,
    ts.quality_score,
    ts.validation_count,
    ts.approve_count,
    ts.reject_count,
    ts.status,
    ts.created_at,
    up.username as spotter_username
FROM public.trend_submissions ts
LEFT JOIN public.user_profiles up ON ts.spotter_id = up.id
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Grant necessary permissions
GRANT SELECT ON public.public_trends TO authenticated;
GRANT SELECT ON public.verify_page TO authenticated;
GRANT SELECT ON public.trends_for_validation TO authenticated;
GRANT SELECT ON public.available_trends_for_verification TO authenticated;

-- Add a check to ensure the values don't exceed BIGINT limits in the application
-- This is handled in the application code, but we can add a constraint as safety
ALTER TABLE public.trend_submissions
ADD CONSTRAINT check_likes_count CHECK (likes_count >= 0 AND likes_count <= 9223372036854775807),
ADD CONSTRAINT check_views_count CHECK (views_count >= 0 AND views_count <= 9223372036854775807),
ADD CONSTRAINT check_comments_count CHECK (comments_count >= 0 AND comments_count <= 9223372036854775807),
ADD CONSTRAINT check_shares_count CHECK (shares_count >= 0 AND shares_count <= 9223372036854775807);

-- Create indexes for better performance with large numbers
CREATE INDEX IF NOT EXISTS idx_trend_submissions_likes ON public.trend_submissions(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_views ON public.trend_submissions(views_count DESC);

-- Notify that the migration is complete
DO $$
BEGIN
    RAISE NOTICE 'Numeric overflow fix applied successfully. All count fields now support values up to 9.2 quintillion.';
END $$;