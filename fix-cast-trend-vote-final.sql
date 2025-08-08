-- Drop and recreate the cast_trend_vote function with proper error handling
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT);

CREATE OR REPLACE FUNCTION cast_trend_vote(
    trend_id UUID,
    vote_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_trend_exists BOOLEAN;
    v_is_own_trend BOOLEAN;
    v_existing_vote_id UUID;
    v_validation_id UUID;
    v_earnings_amount DECIMAL(10,2) := 0.01;
BEGIN
    -- Get the current user ID from auth context
    v_user_id := auth.uid();
    
    -- Check if user is authenticated
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Not authenticated. Please log in.'
        );
    END IF;
    
    -- Check if the trend exists and get spotter_id
    SELECT EXISTS(
        SELECT 1 FROM trend_submissions 
        WHERE id = trend_id
    ) INTO v_trend_exists;
    
    IF NOT v_trend_exists THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found.'
        );
    END IF;
    
    -- Check if user is trying to vote on their own trend
    SELECT EXISTS(
        SELECT 1 FROM trend_submissions 
        WHERE id = trend_id 
        AND spotter_id = v_user_id
    ) INTO v_is_own_trend;
    
    IF v_is_own_trend THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You cannot validate your own trend submission.'
        );
    END IF;
    
    -- Check if user has already voted on this trend
    SELECT id INTO v_existing_vote_id
    FROM trend_validations
    WHERE trend_submission_id = trend_id
    AND validator_id = v_user_id;
    
    IF v_existing_vote_id IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already validated this trend.'
        );
    END IF;
    
    -- Insert the validation
    INSERT INTO trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        created_at
    ) VALUES (
        trend_id,
        v_user_id,
        vote_type,
        NOW()
    )
    RETURNING id INTO v_validation_id;
    
    -- Record earnings for the validation
    BEGIN
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            transaction_type,
            trend_submission_id,
            description,
            created_at
        ) VALUES (
            v_user_id,
            v_earnings_amount,
            'validation_reward',
            trend_id,
            'Earned for validating trend',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Log error but don't fail the validation
        RAISE WARNING 'Failed to record earnings: %', SQLERRM;
    END;
    
    -- Update user's total earnings
    UPDATE user_profiles
    SET 
        total_earned = COALESCE(total_earned, 0) + v_earnings_amount,
        available_balance = COALESCE(available_balance, 0) + v_earnings_amount,
        updated_at = NOW()
    WHERE id = v_user_id;
    
    -- Update vote counts on the trend
    IF vote_type = 'verify' THEN
        UPDATE trend_submissions
        SET 
            validation_count = COALESCE(validation_count, 0) + 1,
            approve_count = COALESCE(approve_count, 0) + 1,
            updated_at = NOW()
        WHERE id = trend_id;
    ELSIF vote_type = 'reject' THEN
        UPDATE trend_submissions
        SET 
            validation_count = COALESCE(validation_count, 0) + 1,
            reject_count = COALESCE(reject_count, 0) + 1,
            updated_at = NOW()
        WHERE id = trend_id;
    END IF;
    
    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'validation_id', v_validation_id,
        'earnings', v_earnings_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    -- Catch any unexpected errors
    RETURN jsonb_build_object(
        'success', false,
        'error', COALESCE(SQLERRM, 'An unexpected error occurred')
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote(UUID, TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION cast_trend_vote IS 'Allows authenticated users to vote on trend submissions';

-- Ensure the earnings_ledger table has the right column
DO $$
BEGIN
    -- Check if trend_submission_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'earnings_ledger' 
        AND column_name = 'trend_submission_id'
    ) THEN
        ALTER TABLE earnings_ledger ADD COLUMN trend_submission_id UUID REFERENCES trend_submissions(id);
    END IF;
END $$;

-- Ensure user_profiles has the necessary columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_earned') THEN
        ALTER TABLE user_profiles ADD COLUMN total_earned DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'available_balance') THEN
        ALTER TABLE user_profiles ADD COLUMN available_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Ensure trend_submissions has vote count columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'approve_count') THEN
        ALTER TABLE trend_submissions ADD COLUMN approve_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'reject_count') THEN
        ALTER TABLE trend_submissions ADD COLUMN reject_count INTEGER DEFAULT 0;
    END IF;
END $$;