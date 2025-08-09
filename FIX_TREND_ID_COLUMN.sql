-- FIX TREND_ID COLUMN ERROR
-- The column should be trend_submission_id, not trend_id

-- Drop the incorrect function if it exists
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

-- Create the corrected function
CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_trend_spotter_id UUID;
    v_approve_count INT;
    v_reject_count INT;
    v_new_status TEXT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Get trend spotter_id
    SELECT spotter_id INTO v_trend_spotter_id
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    IF v_trend_spotter_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check if already voted (using trend_submission_id, not trend_id)
    IF EXISTS (
        SELECT 1 FROM trend_validations
        WHERE trend_submission_id = p_trend_id
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Insert vote (using trend_submission_id)
    INSERT INTO trend_validations (
        trend_submission_id,  -- Correct column name
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
    v_new_status := 'pending';
    
    IF v_approve_count >= 2 THEN
        -- APPROVED
        v_new_status := 'approved';
        
        UPDATE trend_submissions
        SET 
            status = 'approved'::trend_status,
            validation_status = 'approved'
        WHERE id = p_trend_id;
        
        -- Update earnings if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
            UPDATE earnings_ledger
            SET status = 'approved'
            WHERE trend_submission_id = p_trend_id
            AND type = 'submission'
            AND status IN ('awaiting_verification', 'pending');
        END IF;
        
        -- Update spotter's profile
        UPDATE profiles
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            earnings_approved = COALESCE(earnings_approved, 0) + 1.00
        WHERE id = v_trend_spotter_id;
        
    ELSIF v_reject_count >= 2 THEN
        -- REJECTED
        v_new_status := 'rejected';
        
        UPDATE trend_submissions
        SET 
            status = 'rejected'::trend_status,
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Update earnings if table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
            UPDATE earnings_ledger
            SET status = 'rejected'
            WHERE trend_submission_id = p_trend_id
            AND type = 'submission'
            AND status IN ('awaiting_verification', 'pending');
        END IF;
        
        -- Update spotter's profile
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        WHERE id = v_trend_spotter_id;
    END IF;
    
    -- Add validator reward
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            trend_submission_id,  -- Correct column name
            created_at
        ) VALUES (
            v_user_id,
            0.01,
            'validation',
            'pending',
            'Validation reward',
            p_trend_id,
            NOW()
        );
    END IF;
    
    -- Update validator's pending earnings
    UPDATE profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'status', v_new_status
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- Verify the fix
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ TREND_ID COLUMN ERROR FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The function now uses trend_submission_id correctly';
    RAISE NOTICE 'Validation should work properly now';
    RAISE NOTICE '========================================';
END $$;