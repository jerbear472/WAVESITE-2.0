-- Function to update user earnings after validation
-- This can be called by your app after inserting a validation

CREATE OR REPLACE FUNCTION update_validation_earnings(
    p_validator_id UUID,
    p_reward_amount DECIMAL DEFAULT 0.02
) RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user_profiles table exists and update it
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
    ) THEN
        -- Update or insert user profile with earnings
        INSERT INTO user_profiles (
            user_id, 
            approved_earnings, 
            total_earned,
            performance_tier
        ) VALUES (
            p_validator_id,
            p_reward_amount,
            p_reward_amount,
            'learning'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            approved_earnings = COALESCE(user_profiles.approved_earnings, 0) + p_reward_amount,
            total_earned = COALESCE(user_profiles.total_earned, 0) + p_reward_amount,
            last_active = NOW();
            
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permission
GRANT EXECUTE ON FUNCTION update_validation_earnings TO authenticated;

-- Test
DO $$
BEGIN
    RAISE NOTICE '✅ update_validation_earnings function created';
    RAISE NOTICE '   - Updates user earnings after validation';
    RAISE NOTICE '   - Safe: checks if user_profiles exists';
    RAISE NOTICE '   - Call after inserting to trend_validations';
END $$;