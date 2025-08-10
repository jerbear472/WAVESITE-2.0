-- Create the cast_trend_vote function that's missing from the database
-- This function handles trend validation voting

-- Drop if exists (safely)
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT) CASCADE;

-- Create the function
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_validation_id UUID;
    v_existing_vote TEXT;
    v_trend_status TEXT;
    v_validation_count INTEGER;
    v_verify_count INTEGER;
    v_reject_count INTEGER;
    v_result JSONB;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated'
        );
    END IF;
    
    -- Validate vote type
    IF p_vote NOT IN ('verify', 'reject', 'skip') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid vote type. Must be verify, reject, or skip'
        );
    END IF;
    
    -- Get trend status
    SELECT status INTO v_trend_status
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    IF v_trend_status IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    IF v_trend_status NOT IN ('submitted', 'validating') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend is not available for validation'
        );
    END IF;
    
    -- Check if user already voted
    SELECT id, vote INTO v_validation_id, v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id 
    AND validator_id = v_user_id;
    
    IF v_existing_vote IS NOT NULL THEN
        -- Update existing vote
        UPDATE trend_validations
        SET 
            vote = p_vote,
            confirmed = (p_vote = 'verify'),
            updated_at = NOW()
        WHERE id = v_validation_id;
    ELSE
        -- Create new validation record
        INSERT INTO trend_validations (
            trend_id,
            validator_id,
            vote,
            confirmed,
            reward_amount
        ) VALUES (
            p_trend_id,
            v_user_id,
            p_vote,
            (p_vote = 'verify'),
            0.10  -- Base validation reward
        )
        RETURNING id INTO v_validation_id;
    END IF;
    
    -- Skip means no status update needed
    IF p_vote = 'skip' THEN
        RETURN jsonb_build_object(
            'success', true,
            'validation_id', v_validation_id,
            'vote', p_vote,
            'message', 'Skipped trend'
        );
    END IF;
    
    -- Count votes for this trend
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify') as verify_count,
        COUNT(*) FILTER (WHERE vote = 'reject') as reject_count,
        COUNT(*) as total_count
    INTO v_verify_count, v_reject_count, v_validation_count
    FROM trend_validations
    WHERE trend_id = p_trend_id;
    
    -- Update trend status based on votes (3 votes needed for decision)
    IF v_verify_count >= 3 THEN
        -- Trend approved
        UPDATE trend_submissions
        SET 
            status = 'approved',
            validated_at = NOW(),
            validation_count = v_validation_count,
            quality_score = (v_verify_count::FLOAT / v_validation_count::FLOAT * 100)::INTEGER
        WHERE id = p_trend_id;
        
        -- Award bonus to spotter
        UPDATE user_profiles
        SET 
            total_earnings = total_earnings + 0.50,  -- Validation bonus
            accuracy_score = LEAST(100, accuracy_score + 5)
        WHERE id = (SELECT spotter_id FROM trend_submissions WHERE id = p_trend_id);
        
    ELSIF v_reject_count >= 3 THEN
        -- Trend rejected
        UPDATE trend_submissions
        SET 
            status = 'rejected',
            validated_at = NOW(),
            validation_count = v_validation_count,
            quality_score = 0
        WHERE id = p_trend_id;
        
    ELSIF v_validation_count >= 1 AND v_trend_status = 'submitted' THEN
        -- Start validation process
        UPDATE trend_submissions
        SET status = 'validating'
        WHERE id = p_trend_id;
    END IF;
    
    -- Update validator stats
    UPDATE user_profiles
    SET 
        validation_score = LEAST(100, validation_score + 1),
        total_earnings = total_earnings + 0.10  -- Validation reward
    WHERE id = v_user_id;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'validation_id', v_validation_id,
        'vote', p_vote,
        'verify_count', v_verify_count,
        'reject_count', v_reject_count,
        'total_votes', v_validation_count
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.cast_trend_vote(UUID, TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.cast_trend_vote IS 'Allows authenticated users to vote on trend submissions for validation';

-- Verify the function was created
SELECT 
    'Function created successfully' as status,
    proname as function_name,
    pronargs as arg_count
FROM pg_proc 
WHERE proname = 'cast_trend_vote';