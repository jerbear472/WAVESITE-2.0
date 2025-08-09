-- THIS IS THE WORKING FIX - YOUR DATABASE HAS trend_submission_id
-- Run this entire script in Supabase SQL Editor

-- Step 1: Verify column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
AND column_name LIKE '%trend%';

-- Step 2: Drop any existing function
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

-- Step 3: Create the CORRECT function using trend_submission_id
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
    v_approve_count INT;
    v_reject_count INT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Get trend spotter
    SELECT spotter_id INTO v_spotter_id
    FROM trend_submissions 
    WHERE id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted using trend_submission_id (THE CORRECT COLUMN)
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE trend_submission_id = p_trend_id 
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote using trend_submission_id (THE CORRECT COLUMN)
    INSERT INTO trend_validations (
        trend_submission_id,  -- THIS IS THE CORRECT COLUMN NAME
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
        -- APPROVED
        UPDATE trend_submissions
        SET 
            status = 'approved'::trend_status,
            validation_status = 'approved'
        WHERE id = p_trend_id;
        
        -- Update spotter's earnings
        UPDATE profiles
        SET 
            awaiting_verification = GREATEST(0, COALESCE(awaiting_verification, 0) - 1.00),
            earnings_approved = COALESCE(earnings_approved, 0) + 1.00
        WHERE id = v_spotter_id;
        
    ELSIF COALESCE(v_reject_count, 0) >= 2 THEN
        -- REJECTED
        UPDATE trend_submissions
        SET 
            status = 'rejected'::trend_status,
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Update spotter's earnings
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, COALESCE(awaiting_verification, 0) - 1.00)
        WHERE id = v_spotter_id;
    END IF;
    
    -- Add validator reward
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

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;

-- Step 5: Verify the function was created
SELECT 
    'Function created successfully!' as status,
    'The verify page should work now' as message;

-- Step 6: Test that we can query the validations table
SELECT COUNT(*) as validation_count 
FROM trend_validations 
WHERE trend_submission_id IS NOT NULL;