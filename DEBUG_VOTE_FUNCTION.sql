-- DEBUG VERSION - This will show us exactly what's happening
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

CREATE OR REPLACE FUNCTION cast_trend_vote(
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
    v_debug_info TEXT := '';
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    v_debug_info := v_debug_info || 'User ID: ' || COALESCE(v_user_id::text, 'NULL') || '; ';
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated',
            'debug', v_debug_info
        );
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trend not found',
            'debug', 'Trend ID ' || p_trend_id || ' does not exist in trend_submissions'
        );
    END IF;
    
    -- Get spotter
    SELECT spotter_id INTO v_spotter_id
    FROM trend_submissions 
    WHERE id = p_trend_id;
    v_debug_info := v_debug_info || 'Spotter: ' || COALESCE(v_spotter_id::text, 'NULL') || '; ';
    
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE trend_submission_id = p_trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already voted on this trend',
            'debug', v_debug_info || 'Vote already exists'
        );
    END IF;
    
    -- Try to insert vote
    BEGIN
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
        v_debug_info := v_debug_info || 'Vote inserted successfully; ';
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to insert vote: ' || SQLERRM,
            'debug', v_debug_info || 'Insert failed with: ' || SQLERRM
        );
    END;
    
    -- Update counts
    BEGIN
        IF p_vote = 'verify' THEN
            UPDATE trend_submissions
            SET 
                approve_count = COALESCE(approve_count, 0) + 1,
                validation_count = COALESCE(validation_count, 0) + 1
            WHERE id = p_trend_id;
            v_debug_info := v_debug_info || 'Approve count updated; ';
        ELSE
            UPDATE trend_submissions
            SET 
                reject_count = COALESCE(reject_count, 0) + 1,
                validation_count = COALESCE(validation_count, 0) + 1
            WHERE id = p_trend_id;
            v_debug_info := v_debug_info || 'Reject count updated; ';
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Failed to update counts: ' || SQLERRM,
            'debug', v_debug_info
        );
    END;
    
    -- Update profiles
    BEGIN
        UPDATE profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
            total_earnings = COALESCE(total_earnings, 0) + 0.01
        WHERE id = v_user_id;
        v_debug_info := v_debug_info || 'Profile updated; ';
    EXCEPTION WHEN OTHERS THEN
        -- Continue even if profile update fails
        v_debug_info := v_debug_info || 'Profile update failed but continuing; ';
    END;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'debug', v_debug_info || 'Complete!'
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', 'Unexpected error: ' || SQLERRM,
        'debug', v_debug_info || ' Failed at: ' || SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;

-- Also check table structure
SELECT 
    'Check these results:' as message,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_validations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there are any existing validations
SELECT COUNT(*) as existing_validations FROM trend_validations;

-- Check if trend_submissions has the required columns
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'validation_status')
AND table_schema = 'public';

-- Check profiles columns
SELECT 
    column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('earnings_pending', 'total_earnings', 'awaiting_verification', 'earnings_approved')
AND table_schema = 'public';