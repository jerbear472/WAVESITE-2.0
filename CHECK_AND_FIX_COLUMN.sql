-- CHECK AND FIX THE COLUMN NAME ISSUE
-- Run this entire script in Supabase SQL Editor

-- Step 1: Check what columns actually exist in trend_validations table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check if we need to rename the column
DO $$
BEGIN
    -- Check if trend_id exists and trend_submission_id doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_id'
        AND table_schema = 'public'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
        AND table_schema = 'public'
    ) THEN
        -- Rename the column
        ALTER TABLE public.trend_validations 
        RENAME COLUMN trend_id TO trend_submission_id;
        
        RAISE NOTICE 'Column renamed from trend_id to trend_submission_id';
    ELSE
        RAISE NOTICE 'Column already correct or does not need renaming';
    END IF;
END $$;

-- Step 3: Drop the broken function
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

-- Step 4: Create the corrected function that works with either column name
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
    v_column_name TEXT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Check which column name exists
    SELECT column_name INTO v_column_name
    FROM information_schema.columns 
    WHERE table_name = 'trend_validations' 
    AND column_name IN ('trend_id', 'trend_submission_id')
    AND table_schema = 'public'
    LIMIT 1;
    
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
    
    -- Check if already voted (works with either column name)
    IF v_column_name = 'trend_id' THEN
        IF EXISTS (
            SELECT 1 FROM trend_validations
            WHERE trend_id = p_trend_id
            AND validator_id = v_user_id
        ) THEN
            RETURN json_build_object(
                'success', false,
                'error', 'Already voted on this trend'
            );
        END IF;
        
        -- Insert vote using trend_id
        INSERT INTO trend_validations (
            trend_id,
            validator_id,
            vote,
            created_at
        ) VALUES (
            p_trend_id,
            v_user_id,
            p_vote,
            NOW()
        );
    ELSE
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
        
        -- Insert vote using trend_submission_id
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
    END IF;
    
    -- Update counts
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
    
    -- Check thresholds
    v_new_status := 'pending';
    
    IF v_approve_count >= 2 THEN
        v_new_status := 'approved';
        
        UPDATE trend_submissions
        SET 
            status = 'approved'::trend_status,
            validation_status = 'approved'
        WHERE id = p_trend_id;
        
        -- Update spotter's earnings
        UPDATE profiles
        SET 
            awaiting_verification = GREATEST(0, awaiting_verification - 1.00),
            earnings_approved = COALESCE(earnings_approved, 0) + 1.00
        WHERE id = v_trend_spotter_id;
        
    ELSIF v_reject_count >= 2 THEN
        v_new_status := 'rejected';
        
        UPDATE trend_submissions
        SET 
            status = 'rejected'::trend_status,
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Remove from awaiting
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, awaiting_verification - 1.00)
        WHERE id = v_trend_spotter_id;
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- Final verification
SELECT 
    'DONE! Column check and function fix complete.' as message,
    'Please test the verify page now.' as action;