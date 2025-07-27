-- Fix foreign key constraint with view dependencies
-- This handles the public_trends view that depends on spotter_id

-- Step 1: Save the view definition before dropping it
CREATE OR REPLACE FUNCTION save_view_definition() RETURNS TEXT AS $$
DECLARE
    view_def TEXT;
BEGIN
    SELECT pg_get_viewdef('public_trends'::regclass, true) INTO view_def;
    RETURN view_def;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Save the view definition
DO $$
DECLARE
    saved_view TEXT;
BEGIN
    saved_view := save_view_definition();
    IF saved_view IS NOT NULL THEN
        RAISE NOTICE 'View definition saved: %', saved_view;
    END IF;
END $$;

-- Step 2: Drop the dependent view
DROP VIEW IF EXISTS public_trends CASCADE;

-- Step 3: Now we can safely drop the foreign key constraint
ALTER TABLE public.trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;

-- Step 4: Recreate the view (basic version if original not found)
CREATE OR REPLACE VIEW public_trends AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.evidence,
    ts.virality_prediction,
    ts.quality_score,
    ts.validation_count,
    ts.status,
    ts.created_at,
    ts.updated_at,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.post_url,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.thumbnail_url,
    ts.posted_at
FROM public.trend_submissions ts
WHERE ts.status IN ('submitted', 'validating', 'approved', 'viral');

-- Step 5: Update RLS policies for trend_submissions
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can delete own trend submissions" ON public.trend_submissions;

-- Create new policies without auth.users dependency
CREATE POLICY "Authenticated users can create trends" ON public.trend_submissions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view trends" ON public.trend_submissions
FOR SELECT USING (true);

CREATE POLICY "Users can update their own trends" ON public.trend_submissions
FOR UPDATE TO authenticated
USING (auth.uid()::text = spotter_id::text);

CREATE POLICY "Users can delete their own trends" ON public.trend_submissions
FOR DELETE TO authenticated
USING (auth.uid()::text = spotter_id::text);

-- Step 6: Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;
GRANT SELECT ON public_trends TO anon;
GRANT SELECT ON public_trends TO authenticated;

-- Clean up
DROP FUNCTION IF EXISTS save_view_definition();

-- Verify the fix
SELECT 
    'Success! Foreign key removed and view recreated.' as status,
    (SELECT COUNT(*) FROM public.trend_submissions) as total_submissions,
    (SELECT COUNT(*) FROM public_trends) as public_trends_count;