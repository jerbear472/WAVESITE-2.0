-- CRITICAL FIX: Create the missing cast_trend_vote function
-- This function is called by the verify page but doesn't exist!

DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT);

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
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists and get spotter
    SELECT spotter_id INTO v_spotter_id
    FROM trend_submissions 
    WHERE id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE trend_submission_id = p_trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote
    INSERT INTO trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        created_at
    ) VALUES (
        p_trend_id,
        v_user_id,
        p_vote,
        NOW()
    );
    
    -- Update counts on trend
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id
        RETURNING approve_count INTO v_approve_count;
    ELSE
        UPDATE trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id
        RETURNING reject_count INTO v_reject_count;
    END IF;
    
    -- Get final counts
    SELECT approve_count, reject_count 
    INTO v_approve_count, v_reject_count
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if trend reaches 2-vote threshold
    IF COALESCE(v_approve_count, 0) >= 2 THEN
        -- APPROVED - Move $1 from pending to approved for spotter
        UPDATE trend_submissions
        SET 
            status = 'approved'::trend_status,
            validation_status = 'approved'
        WHERE id = p_trend_id;
        
        -- Update spotter's earnings (move from pending to approved)
        UPDATE profiles
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - 1.00),
            earnings_approved = COALESCE(earnings_approved, 0) + 1.00
        WHERE id = v_spotter_id;
        
    ELSIF COALESCE(v_reject_count, 0) >= 2 THEN
        -- REJECTED - Remove $1 from pending for spotter
        UPDATE trend_submissions
        SET 
            status = 'rejected'::trend_status,
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Remove from spotter's pending earnings
        UPDATE profiles
        SET earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - 1.00)
        WHERE id = v_spotter_id;
    END IF;
    
    -- Add validator reward ($0.01)
    UPDATE profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(v_approve_count, 0),
        'reject_count', COALESCE(v_reject_count, 0),
        'status', CASE 
            WHEN COALESCE(v_approve_count, 0) >= 2 THEN 'approved'
            WHEN COALESCE(v_reject_count, 0) >= 2 THEN 'rejected'
            ELSE 'pending'
        END
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;

-- Verify function exists
SELECT 
    'cast_trend_vote function created successfully' as status,
    'Validation system should now work' as message;