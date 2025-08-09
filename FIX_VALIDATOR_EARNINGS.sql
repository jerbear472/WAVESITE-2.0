-- FIX VALIDATOR EARNINGS - Goes directly to earnings_approved
-- Validators get paid immediately since no one approves validations

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
    
    -- VALIDATOR REWARD: $0.01 DIRECTLY TO APPROVED (no approval needed for validations!)
    UPDATE profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
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

-- Also update the trigger for new validations
CREATE OR REPLACE FUNCTION handle_new_validation()
RETURNS TRIGGER AS $$
BEGIN
    -- Add $0.01 DIRECTLY to validator's APPROVED earnings (not pending!)
    UPDATE profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_validation_created ON trend_validations;
CREATE TRIGGER on_validation_created
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_validation();

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;

-- Fix any existing validator earnings that are in pending instead of approved
-- Move all validation earnings from pending to approved
UPDATE profiles p
SET 
    earnings_approved = COALESCE(earnings_approved, 0) + validation_earnings,
    earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - validation_earnings)
FROM (
    SELECT 
        validator_id,
        COUNT(*) * 0.01 as validation_earnings
    FROM trend_validations
    GROUP BY validator_id
) v
WHERE p.id = v.validator_id
AND p.earnings_pending > 0;

SELECT 
    'Validator earnings fixed!' as status,
    'All validation rewards now go directly to earnings_approved' as message;