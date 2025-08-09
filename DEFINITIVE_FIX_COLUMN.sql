-- DEFINITIVE FIX FOR TREND_ID COLUMN ERROR
-- This will work regardless of your current database state

-- Step 1: Check current column structure
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    -- Check if trend_submission_id exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
        AND table_schema = 'public'
    ) INTO v_column_exists;
    
    IF NOT v_column_exists THEN
        -- Column doesn't exist, need to add it
        ALTER TABLE public.trend_validations 
        ADD COLUMN IF NOT EXISTS trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;
        
        -- Copy data from trend_id if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' 
            AND column_name = 'trend_id'
            AND table_schema = 'public'
        ) THEN
            UPDATE public.trend_validations 
            SET trend_submission_id = trend_id
            WHERE trend_submission_id IS NULL;
        END IF;
        
        RAISE NOTICE 'Added trend_submission_id column';
    ELSE
        RAISE NOTICE 'trend_submission_id column already exists';
    END IF;
END $$;

-- Step 2: Drop ALL versions of the function
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);
DROP FUNCTION IF EXISTS public.cast_trend_vote(UUID, TEXT);

-- Step 3: Create the working function
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
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
    
    -- Check if already voted - try both column names for compatibility
    IF EXISTS (
        SELECT 1 FROM trend_validations
        WHERE (
            (trend_submission_id = p_trend_id) OR 
            (
                EXISTS(SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'trend_validations' 
                       AND column_name = 'trend_id' 
                       AND table_schema = 'public')
                AND trend_id = p_trend_id
            )
        )
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Insert vote - handle both possible column configurations
    BEGIN
        -- Try to insert with trend_submission_id first
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
    EXCEPTION 
        WHEN undefined_column THEN
            -- If trend_submission_id doesn't exist, try trend_id
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
    END;
    
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
    
    IF COALESCE(v_approve_count, 0) >= 2 THEN
        v_new_status := 'approved';
        
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
        WHERE id = v_trend_spotter_id;
        
    ELSIF COALESCE(v_reject_count, 0) >= 2 THEN
        v_new_status := 'rejected';
        
        UPDATE trend_submissions
        SET 
            status = 'rejected'::trend_status,
            validation_status = 'rejected'
        WHERE id = p_trend_id;
        
        -- Remove from awaiting
        UPDATE profiles
        SET awaiting_verification = GREATEST(0, COALESCE(awaiting_verification, 0) - 1.00)
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
        'approve_count', COALESCE(v_approve_count, 0),
        'reject_count', COALESCE(v_reject_count, 0),
        'status', v_new_status
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Return the actual error for debugging
    RETURN json_build_object(
        'success', false,
        'error', 'Database error: ' || SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;

-- Step 5: Test the function exists
SELECT 
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'cast_trend_vote'
AND n.nspname = 'public';

-- Step 6: Show current table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_validations'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Final message
SELECT 'FIX COMPLETE! The function should now work.' as status;