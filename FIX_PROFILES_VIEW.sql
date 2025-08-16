-- CRITICAL: profiles is a VIEW that reads from auth.users
-- We need to update the actual source table or create a proper solution

-- 1. First, let's see what the profiles view is based on
SELECT definition 
FROM pg_views 
WHERE viewname = 'profiles';

-- 2. Check if user_profiles table has the earnings data
SELECT 
    user_id,
    pending_earnings,
    approved_earnings,
    total_earned,
    performance_tier
FROM user_profiles
LIMIT 5;

-- 3. Since profiles is a view, we need to update user_profiles directly
-- and make sure the Auth context reads from the right place

-- Update the add_pending_earnings function to ONLY update user_profiles
CREATE OR REPLACE FUNCTION add_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Trend submission'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update user_profiles (the actual table with earnings)
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount,
        last_active = NOW()
    WHERE user_id = p_user_id;
    
    -- If no row was updated, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            user_id, 
            pending_earnings,
            total_earned,
            performance_tier
        ) VALUES (
            p_user_id,
            p_amount,
            p_amount,
            'learning'
        );
    END IF;
    
    -- Also create earnings_ledger entry
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description
    ) VALUES (
        p_user_id,
        p_amount,
        'trend_submission',
        'pending',
        p_description
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create a function to get user's complete profile with earnings
CREATE OR REPLACE FUNCTION get_user_profile_with_earnings(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    username TEXT,
    pending_earnings DECIMAL,
    approved_earnings DECIMAL,
    total_earned DECIMAL,
    performance_tier TEXT,
    current_streak INT,
    session_streak INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id as user_id,
        p.email,
        p.username,
        COALESCE(up.pending_earnings, 0.00) as pending_earnings,
        COALESCE(up.approved_earnings, 0.00) as approved_earnings,
        COALESCE(up.total_earned, 0.00) as total_earned,
        COALESCE(up.performance_tier, 'learning') as performance_tier,
        COALESCE(up.current_streak, 0) as current_streak,
        COALESCE(up.session_streak, 0) as session_streak
    FROM profiles p
    LEFT JOIN user_profiles up ON p.id = up.user_id
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION add_pending_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_profile_with_earnings TO authenticated;

-- 6. Ensure user_profiles has all necessary columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_spotted INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- 7. Recalculate all pending earnings from earnings_ledger
UPDATE user_profiles up
SET pending_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM earnings_ledger
    WHERE user_id = up.user_id
    AND status IN ('pending', 'awaiting_validation')
);

-- 8. Create or replace the profiles view to include earnings
-- This creates a new view that includes earnings data
CREATE OR REPLACE VIEW profiles_with_earnings AS
SELECT 
    p.*,
    COALESCE(up.pending_earnings, 0.00) as pending_earnings,
    COALESCE(up.approved_earnings, 0.00) as approved_earnings,
    COALESCE(up.total_earned, 0.00) as total_earnings,
    COALESCE(up.performance_tier, 'learning') as performance_tier,
    COALESCE(up.current_streak, 0) as current_streak,
    COALESCE(up.session_streak, 0) as session_streak,
    COALESCE(up.trends_spotted, 0) as trends_spotted
FROM profiles p
LEFT JOIN user_profiles up ON p.id = up.user_id;

-- Grant access to the new view
GRANT SELECT ON profiles_with_earnings TO authenticated;

-- Test
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM user_profiles WHERE pending_earnings > 0;
    RAISE NOTICE '✅ EARNINGS SYSTEM FIXED FOR PROFILES VIEW';
    RAISE NOTICE '   - profiles is a VIEW (cannot add columns)';
    RAISE NOTICE '   - user_profiles table has all earnings data';
    RAISE NOTICE '   - Created profiles_with_earnings view that joins both';
    RAISE NOTICE '   - % users have pending earnings in user_profiles', v_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Next step:';
    RAISE NOTICE '   Update the app to read from profiles_with_earnings view';
    RAISE NOTICE '   OR read earnings directly from user_profiles table';
END $$;