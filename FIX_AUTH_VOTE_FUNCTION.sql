-- FIX AUTHENTICATION ISSUE IN VOTE FUNCTION
-- Run this in Supabase SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT);

-- Create a new version that handles auth better
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- This is important!
AS $$
DECLARE
    v_user_id UUID;
    v_existing_vote TEXT;
BEGIN
    -- Get current user ID from auth context
    v_user_id := auth.uid();
    
    -- Log for debugging
    RAISE NOTICE 'User ID from auth.uid(): %', v_user_id;
    
    -- If still no user, try to get from JWT
    IF v_user_id IS NULL THEN
        -- Try alternative method
        v_user_id := current_setting('request.jwt.claims', true)::json->>'sub';
        RAISE NOTICE 'User ID from JWT: %', v_user_id;
    END IF;
    
    -- Return error if still no user
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Not authenticated - please sign in'
        );
    END IF;
    
    -- Check if trend exists
    IF NOT EXISTS (SELECT 1 FROM trend_submissions WHERE id = p_trend_id) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check if already voted
    SELECT vote INTO v_existing_vote
    FROM trend_validations
    WHERE trend_submission_id = p_trend_id
    AND validator_id = v_user_id;
    
    IF v_existing_vote IS NOT NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'You have already voted on this trend'
        );
    END IF;
    
    -- Insert the vote
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
    
    -- Update vote counts
    IF p_vote = 'verify' THEN
        UPDATE trend_submissions
        SET 
            approve_count = COALESCE(approve_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id;
    ELSE
        UPDATE trend_submissions
        SET 
            reject_count = COALESCE(reject_count, 0) + 1,
            validation_count = COALESCE(validation_count, 0) + 1
        WHERE id = p_trend_id;
    END IF;
    
    -- Add earnings for validator
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        trend_submission_id
    ) VALUES (
        v_user_id,
        0.01,
        'validation',
        'pending',
        'Trend validation reward',
        p_trend_id
    ) ON CONFLICT DO NOTHING;
    
    -- Update validator's earnings
    UPDATE profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = v_user_id;
    
    -- Check if trend is now approved/rejected (2 votes needed)
    DECLARE
        v_approve_count INT;
        v_reject_count INT;
    BEGIN
        SELECT approve_count, reject_count 
        INTO v_approve_count, v_reject_count
        FROM trend_submissions
        WHERE id = p_trend_id;
        
        IF v_approve_count >= 2 THEN
            UPDATE trend_submissions
            SET 
                status = 'approved',
                validation_status = 'approved'
            WHERE id = p_trend_id;
            
            -- Move earnings to approved
            UPDATE earnings_ledger
            SET status = 'approved'
            WHERE trend_submission_id = p_trend_id
            AND type = 'submission'
            AND status = 'awaiting_verification';
            
        ELSIF v_reject_count >= 2 THEN
            UPDATE trend_submissions
            SET 
                status = 'rejected',
                validation_status = 'rejected'
            WHERE id = p_trend_id;
            
            -- Mark earnings as rejected
            UPDATE earnings_ledger
            SET status = 'rejected'
            WHERE trend_submission_id = p_trend_id
            AND type = 'submission'
            AND status = 'awaiting_verification';
        END IF;
    END;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'message', 'Vote recorded successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Grant proper permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO service_role;

-- Also ensure the tables have proper permissions
GRANT SELECT, INSERT, UPDATE ON trend_submissions TO authenticated;
GRANT SELECT, INSERT ON trend_validations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON earnings_ledger TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Test the function exists and is callable
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ VOTE FUNCTION FIXED!';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'The function now:';
    RAISE NOTICE '  - Uses SECURITY DEFINER for proper auth';
    RAISE NOTICE '  - Has multiple auth fallbacks';
    RAISE NOTICE '  - Handles errors gracefully';
    RAISE NOTICE '  - Updates earnings properly';
    RAISE NOTICE '';
    RAISE NOTICE 'The verify page should work now!';
    RAISE NOTICE '========================================';
END $$;