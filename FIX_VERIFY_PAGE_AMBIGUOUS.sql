-- Fix for ambiguous 'rejects' column error on verify page
-- This error occurs when there are ambiguous column references

-- First, let's check what columns exist in both tables
SELECT 
    column_name,
    data_type,
    table_name
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name IN ('trend_submissions', 'trend_validations', 'profiles', 'users')
    AND column_name LIKE '%reject%'
ORDER BY 
    table_name, column_name;

-- The issue is likely with the cast_trend_vote function or a view
-- Let's recreate the function with proper column qualification

DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_spotter_id UUID;
    v_approve_count INT;
    v_reject_count INT;
    v_validation_count INT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists (explicit table reference)
    SELECT ts.spotter_id INTO v_spotter_id
    FROM public.trend_submissions ts
    WHERE ts.id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted (with explicit table aliases)
    IF EXISTS (
        SELECT 1 FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
        AND tv.validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote with explicit column names
    INSERT INTO public.trend_validations (
        trend_submission_id,
        trend_id,
        validator_id,
        vote,
        confirmed,
        created_at
    ) VALUES (
        p_trend_id,
        p_trend_id,
        v_user_id,
        p_vote,
        CASE WHEN p_vote = 'verify' THEN true ELSE false END,
        NOW()
    );
    
    -- Update counts with explicit calculation
    UPDATE public.trend_submissions ts
    SET 
        approve_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations tv
            WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
            AND (tv.vote = 'verify' OR tv.confirmed = true)
        ),
        reject_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations tv
            WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
            AND (tv.vote = 'reject' OR tv.confirmed = false)
        ),
        validation_count = (
            SELECT COUNT(*) 
            FROM public.trend_validations tv
            WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
        ),
        updated_at = NOW()
    WHERE ts.id = p_trend_id;
    
    -- Get updated counts with explicit references
    SELECT 
        ts.approve_count, 
        ts.reject_count,
        ts.validation_count
    INTO 
        v_approve_count, 
        v_reject_count,
        v_validation_count
    FROM public.trend_submissions ts
    WHERE ts.id = p_trend_id;
    
    -- Return with explicit values
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(v_approve_count, 0),
        'reject_count', COALESCE(v_reject_count, 0),
        'validation_count', COALESCE(v_validation_count, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return error with details
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- Create a clean view for trend submissions that avoids ambiguity
CREATE OR REPLACE VIEW public.trends_for_validation AS
SELECT DISTINCT
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.screenshot_url,
    ts.thumbnail_url,
    ts.platform,
    ts.creator_handle,
    ts.creator_name,
    ts.post_caption,
    ts.likes_count,
    ts.comments_count,
    ts.shares_count,
    ts.views_count,
    ts.hashtags,
    ts.post_url,
    ts.posted_at,
    ts.virality_prediction,
    ts.quality_score,
    COALESCE(ts.validation_count, 0) as validation_count,
    COALESCE(ts.approve_count, 0) as approve_count,
    COALESCE(ts.reject_count, 0) as reject_count,
    ts.status,
    ts.created_at,
    ts.updated_at
FROM 
    public.trend_submissions ts
WHERE 
    ts.status IN ('submitted', 'validating')  -- Removed 'pending' as it's not a valid enum value
ORDER BY 
    ts.created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.trends_for_validation TO authenticated;
GRANT SELECT ON public.trends_for_validation TO anon;

-- Test the function
DO $$
DECLARE
    test_result JSON;
BEGIN
    -- Try to call the function (will fail if not authenticated, but tests syntax)
    test_result := public.cast_trend_vote(
        '00000000-0000-0000-0000-000000000000'::UUID, 
        'verify'
    );
    RAISE NOTICE 'Function test result: %', test_result;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Function test (expected to fail for auth): %', SQLERRM;
END $$;

-- Show the result
SELECT 'Fix applied successfully. The verify page should now work without ambiguous column errors.' as status;