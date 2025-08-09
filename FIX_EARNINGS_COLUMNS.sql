-- FIX EARNINGS COLUMNS - Consolidate to use only earnings_pending
-- Run this entire script in Supabase

-- Step 1: Ensure earnings_pending exists and has the right data
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0;

-- Step 2: Migrate any data from awaiting_verification to earnings_pending if needed
UPDATE profiles 
SET earnings_pending = COALESCE(earnings_pending, 0) + COALESCE(awaiting_verification, 0)
WHERE awaiting_verification > 0;

-- Step 3: Drop the redundant awaiting_verification column
ALTER TABLE profiles 
DROP COLUMN IF EXISTS awaiting_verification;

-- Step 4: Ensure other earnings columns exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0;

-- Step 5: Drop and recreate the cast_trend_vote function with correct column names
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

-- Step 6: Also update the trigger for new trend submissions to use earnings_pending
CREATE OR REPLACE FUNCTION handle_new_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Add $1.00 to spotter's pending earnings when they submit a trend
    UPDATE profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + 1.00,
        total_earnings = COALESCE(total_earnings, 0) + 1.00
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS on_trend_submission_created ON trend_submissions;
CREATE TRIGGER on_trend_submission_created
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_trend_submission();

-- Step 7: Grant permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO anon;

-- Step 8: Verify the changes
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('earnings_pending', 'earnings_approved', 'total_earnings')
AND table_schema = 'public'
ORDER BY column_name;

-- Final message
SELECT 
    'Earnings columns fixed!' as status,
    'Using earnings_pending for all pending earnings' as message,
    'awaiting_verification column removed' as change;