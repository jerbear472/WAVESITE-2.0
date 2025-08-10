-- Complete fix for verify page errors
-- This addresses both the ambiguous column error and enum value issues

-- First, check valid enum values for reference
SELECT enum_range(NULL::trend_status) as valid_status_values;

-- Drop and recreate the cast_trend_vote function with proper handling
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
    v_current_status trend_status;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists and get current status
    SELECT ts.spotter_id, ts.status 
    INTO v_spotter_id, v_current_status
    FROM public.trend_submissions ts
    WHERE ts.id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id)
        AND tv.validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
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
    
    -- Calculate new counts
    SELECT 
        COUNT(CASE WHEN tv.vote = 'verify' OR tv.confirmed = true THEN 1 END),
        COUNT(CASE WHEN tv.vote = 'reject' OR tv.confirmed = false THEN 1 END),
        COUNT(*)
    INTO 
        v_approve_count,
        v_reject_count,
        v_validation_count
    FROM public.trend_validations tv
    WHERE (tv.trend_submission_id = p_trend_id OR tv.trend_id = p_trend_id);
    
    -- Update trend_submissions with new counts
    -- Note: validation_status is a TEXT column, not the enum
    UPDATE public.trend_submissions ts
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_count = v_validation_count,
        -- Update status enum based on vote counts (using valid enum values)
        status = CASE 
            WHEN v_approve_count >= 3 THEN 'approved'::trend_status
            WHEN v_reject_count >= 3 THEN 'rejected'::trend_status
            WHEN v_validation_count > 0 THEN 'validating'::trend_status
            ELSE v_current_status  -- Keep current status
        END,
        -- Update validation_status TEXT column if it exists
        validation_status = CASE
            WHEN v_approve_count >= 3 THEN 'approved'
            WHEN v_reject_count >= 3 THEN 'rejected'
            WHEN v_validation_count > 0 THEN 'validating'
            ELSE 'pending'  -- This is TEXT, not enum, so 'pending' is OK here
        END,
        updated_at = NOW()
    WHERE ts.id = p_trend_id;
    
    -- Return success with counts
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'validation_count', v_validation_count
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return detailed error for debugging
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE,
        'hint', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO anon;

-- Create a view for trends that need validation
-- This view properly handles the status enum and provides all needed columns
CREATE OR REPLACE VIEW public.trends_for_validation AS
SELECT 
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
    ts.validation_status,  -- Include the TEXT status column too if it exists
    ts.created_at,
    ts.updated_at,
    -- Add calculated fields for the UI
    CASE 
        WHEN ts.created_at > NOW() - INTERVAL '1 hour' THEN 'new'
        WHEN ts.created_at > NOW() - INTERVAL '24 hours' THEN 'recent'
        ELSE 'older'
    END as age_category,
    -- Check if it needs more validations
    CASE 
        WHEN COALESCE(ts.validation_count, 0) < 3 THEN true
        ELSE false
    END as needs_validation
FROM 
    public.trend_submissions ts
WHERE 
    -- Only show trends that need validation
    ts.status IN ('submitted', 'validating')  -- Using valid enum values only
    AND (
        -- Either has few validations
        COALESCE(ts.validation_count, 0) < 5
        -- Or doesn't have a clear decision yet
        OR (COALESCE(ts.approve_count, 0) < 3 AND COALESCE(ts.reject_count, 0) < 3)
    )
ORDER BY 
    -- Prioritize newer trends and those with fewer validations
    ts.validation_count ASC,
    ts.created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON public.trends_for_validation TO authenticated;
GRANT SELECT ON public.trends_for_validation TO anon;

-- Ensure all needed columns exist (won't error if they already exist)
DO $$
BEGIN
    -- Add validation_status TEXT column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'validation_status'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validation_status TEXT DEFAULT 'pending';
    END IF;
    
    -- Add updated_at column if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Create trigger to auto-update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_trend_submissions_updated_at ON public.trend_submissions;
CREATE TRIGGER update_trend_submissions_updated_at
    BEFORE UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verify the setup
SELECT 
    'Setup complete. Valid trend_status enum values are: ' || array_to_string(enum_range(NULL::trend_status)::text[], ', ') as status_info,
    COUNT(*) as trends_needing_validation
FROM 
    public.trend_submissions
WHERE 
    status IN ('submitted', 'validating');