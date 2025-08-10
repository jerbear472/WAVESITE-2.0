-- Simple fix for numeric field overflow without user table dependencies
-- This script will find and drop ALL views that depend on the columns before altering them

-- Step 1: Find all views that depend on trend_submissions table
DO $$ 
DECLARE
    view_name TEXT;
BEGIN
    -- Drop all views that depend on trend_submissions table
    FOR view_name IN 
        SELECT viewname 
        FROM pg_views 
        WHERE schemaname = 'public' 
        AND definition LIKE '%trend_submissions%'
    LOOP
        EXECUTE 'DROP VIEW IF EXISTS public.' || view_name || ' CASCADE';
        RAISE NOTICE 'Dropped view: %', view_name;
    END LOOP;
END $$;

-- Step 2: Now we can safely alter the column types
ALTER TABLE public.trend_submissions 
ALTER COLUMN likes_count TYPE BIGINT,
ALTER COLUMN comments_count TYPE BIGINT,
ALTER COLUMN shares_count TYPE BIGINT,
ALTER COLUMN views_count TYPE BIGINT,
ALTER COLUMN validation_count TYPE BIGINT;

-- Step 3: Create minimal views without user table dependencies
-- Simple public trends view
CREATE OR REPLACE VIEW public.public_trends AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.post_url,
    ts.virality_prediction,
    ts.quality_score,
    ts.created_at,
    ts.posted_at,
    ts.platform
FROM public.trend_submissions ts
WHERE ts.status IN ('approved', 'viral', 'validating')
ORDER BY ts.created_at DESC;

-- Simple verify page view  
CREATE OR REPLACE VIEW public.verify_page AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.post_url,
    ts.virality_prediction,
    ts.quality_score,
    ts.validation_count,
    ts.approve_count,
    ts.reject_count,
    ts.status,
    ts.created_at,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.posted_at,
    ts.platform
FROM public.trend_submissions ts
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Simple trends for validation view
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
    ts.created_at
FROM public.trend_submissions ts
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Simple available trends for verification view
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
    ts.created_at
FROM public.trend_submissions ts
WHERE ts.status IN ('submitted', 'validating')
ORDER BY ts.created_at DESC;

-- Grant permissions on all views
GRANT SELECT ON public.public_trends TO authenticated;
GRANT SELECT ON public.verify_page TO authenticated;
GRANT SELECT ON public.trends_for_validation TO authenticated;
GRANT SELECT ON public.available_trends_for_verification TO authenticated;

-- Add constraints to prevent negative values
ALTER TABLE public.trend_submissions
DROP CONSTRAINT IF EXISTS check_likes_count,
DROP CONSTRAINT IF EXISTS check_views_count,
DROP CONSTRAINT IF EXISTS check_comments_count,
DROP CONSTRAINT IF EXISTS check_shares_count;

ALTER TABLE public.trend_submissions
ADD CONSTRAINT check_likes_count CHECK (likes_count >= 0),
ADD CONSTRAINT check_views_count CHECK (views_count >= 0),
ADD CONSTRAINT check_comments_count CHECK (comments_count >= 0),
ADD CONSTRAINT check_shares_count CHECK (shares_count >= 0);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_likes ON public.trend_submissions(likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_views ON public.trend_submissions(views_count DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter ON public.trend_submissions(spotter_id);

-- Notify completion
DO $$
BEGIN
    RAISE NOTICE 'Simple numeric overflow fix completed successfully!';
    RAISE NOTICE 'All count fields now support values up to 9.2 quintillion.';
    RAISE NOTICE 'Views have been recreated without user table dependencies.';
END $$;