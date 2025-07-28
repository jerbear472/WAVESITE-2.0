-- Fix category column by handling dependent views

-- 1. Find all views that depend on the category column
SELECT DISTINCT 
    schemaname,
    viewname 
FROM pg_views 
WHERE definition LIKE '%trend_submissions%category%'
   OR viewname LIKE '%trend%';

-- 2. Drop the public_trends view (and any other dependent views)
DROP VIEW IF EXISTS public.public_trends CASCADE;
DROP VIEW IF EXISTS public.trending_submissions CASCADE;
DROP VIEW IF EXISTS public.trend_analytics CASCADE;
DROP VIEW IF EXISTS public.approved_trends CASCADE;

-- 3. Now we can safely change the category column type
ALTER TABLE public.trend_submissions 
ALTER COLUMN category TYPE TEXT;

-- 4. Remove any CHECK constraints on category
DO $$ 
DECLARE
    constraint_name TEXT;
BEGIN
    FOR constraint_name IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.trend_submissions'::regclass 
        AND contype = 'c' 
        AND conname LIKE '%category%'
    LOOP
        EXECUTE format('ALTER TABLE public.trend_submissions DROP CONSTRAINT %I', constraint_name);
    END LOOP;
END $$;

-- 5. Recreate the public_trends view if needed (optional)
-- You can skip this if the view isn't being used
CREATE OR REPLACE VIEW public.public_trends AS
SELECT 
    id,
    spotter_id,
    category,
    description,
    screenshot_url,
    evidence,
    virality_prediction,
    status,
    quality_score,
    validation_count,
    created_at,
    creator_handle,
    creator_name,
    post_caption,
    likes_count,
    comments_count,
    views_count,
    hashtags,
    post_url,
    thumbnail_url,
    posted_at
FROM public.trend_submissions
WHERE status IN ('approved', 'viral', 'validating');

-- 6. Grant permissions on the view if it was recreated
GRANT SELECT ON public.public_trends TO authenticated;
GRANT SELECT ON public.public_trends TO anon;

-- 7. Verify the change worked
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
    AND column_name = 'category';

-- Success message
SELECT 'Category column successfully changed to TEXT!' as result;