-- Fix cast_trend_vote function to work with actual table structure

-- First check if the function exists
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'cast_trend_vote';

-- Drop the old function if it exists
DROP FUNCTION IF EXISTS cast_trend_vote(UUID, TEXT) CASCADE;

-- Create a fixed version that works with trend_validations table
CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
) RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_existing_vote RECORD;
    v_validation_id UUID;
    v_reward_amount DECIMAL(10,2);
    v_tier TEXT;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'User not authenticated'
        );
    END IF;
    
    -- Check if user has already voted on this trend
    SELECT * INTO v_existing_vote
    FROM trend_validations
    WHERE trend_id = p_trend_id 
    AND validator_id = v_user_id
    LIMIT 1;
    
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'You have already voted on this trend'
        );
    END IF;
    
    -- Get user tier for earnings calculation
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_tier
    FROM user_profiles
    WHERE user_id = v_user_id;
    
    -- Calculate validation earnings ($0.02 base)
    v_reward_amount := calculate_validation_earnings_amount(COALESCE(v_tier, 'learning'));
    
    -- Insert the validation
    INSERT INTO trend_validations (
        id,
        trend_id,
        validator_id,
        is_genuine,
        vote,
        reward_amount,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_trend_id,
        v_user_id,
        CASE WHEN p_vote = 'genuine' OR p_vote = 'yes' THEN true ELSE false END,
        p_vote,
        v_reward_amount,
        NOW()
    )
    RETURNING id INTO v_validation_id;
    
    -- Update user's approved earnings (validations are approved immediately)
    UPDATE user_profiles
    SET 
        approved_earnings = COALESCE(approved_earnings, 0) + v_reward_amount,
        total_earned = COALESCE(total_earned, 0) + v_reward_amount,
        last_active = NOW()
    WHERE user_id = v_user_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'validation_id', v_validation_id,
        'reward_amount', v_reward_amount,
        'message', format('Vote recorded! You earned %s', formatCurrency(v_reward_amount))
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simple formatCurrency function if it doesn't exist
CREATE OR REPLACE FUNCTION formatCurrency(amount DECIMAL)
RETURNS TEXT AS $$
BEGIN
    RETURN '$' || TO_CHAR(amount, 'FM999999990.00');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant permissions
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION formatCurrency TO authenticated;

-- Test message
DO $$
BEGIN
    RAISE NOTICE '✅ Fixed cast_trend_vote function!';
    RAISE NOTICE '   - No longer references trend_submission_id';
    RAISE NOTICE '   - Uses trend_validations table correctly';
    RAISE NOTICE '   - Calculates $0.02 base validation earnings';
    RAISE NOTICE '   - Updates approved earnings immediately';
END $$;