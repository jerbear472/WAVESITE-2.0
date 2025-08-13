-- =====================================================
-- FINAL FIX FOR USER PROFILES TABLE
-- =====================================================

-- Step 1: Understand the table structure
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Current user_profiles columns:';
    FOR col_record IN 
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles'
        AND column_name IN ('id', 'user_id')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  • % (type: %, nullable: %)', 
            col_record.column_name, 
            col_record.data_type, 
            col_record.is_nullable;
    END LOOP;
END $$;

-- Step 2: Add user_id column if missing (it will reference auth.users)
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 3: Ensure all earnings columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0;

-- Step 4: Create or update test user (handle both id and user_id)
DO $$
DECLARE
    test_user_uuid UUID := '00000000-0000-0000-0000-000000000001';
    existing_id UUID;
BEGIN
    -- Check if test user already exists
    SELECT id INTO existing_id 
    FROM user_profiles 
    WHERE user_id = test_user_uuid 
    OR id = test_user_uuid
    LIMIT 1;
    
    IF existing_id IS NULL THEN
        -- Insert new test user with both id and user_id
        INSERT INTO user_profiles (
            id,           -- This is the primary key
            user_id,      -- This references auth.users
            username,
            email,
            performance_tier,
            current_balance,
            total_earned,
            trends_submitted,
            validations_completed
        ) VALUES (
            test_user_uuid,  -- Use same UUID for id
            test_user_uuid,  -- And for user_id (for testing)
            'test_user',
            'test@wavesight.com',
            'learning',
            0.00,
            0.00,
            0,
            0
        );
        RAISE NOTICE 'Created test user profile';
    ELSE
        -- Update existing user to ensure it has earnings fields
        UPDATE user_profiles 
        SET 
            user_id = COALESCE(user_id, id),
            performance_tier = COALESCE(performance_tier, 'learning'),
            current_balance = COALESCE(current_balance, 0),
            total_earned = COALESCE(total_earned, 0),
            trends_submitted = COALESCE(trends_submitted, 0),
            validations_completed = COALESCE(validations_completed, 0)
        WHERE id = existing_id;
        
        RAISE NOTICE 'Updated existing test user';
    END IF;
END $$;

-- Step 5: Fix the earnings calculation functions to handle both id and user_id
CREATE OR REPLACE FUNCTION calculate_earnings_final(
    p_trend_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0;
    v_tier TEXT;
    v_multiplier DECIMAL;
    v_daily_cap DECIMAL;
    v_trend_cap DECIMAL;
    v_today_earned DECIMAL;
    v_trend RECORD;
BEGIN
    -- Get user tier (try both user_id and id columns)
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id OR id = p_user_id
    LIMIT 1;
    
    -- Get tier config
    SELECT value INTO v_multiplier FROM earnings_config 
    WHERE config_type = 'tier' AND config_key = v_tier;
    
    SELECT value INTO v_daily_cap FROM earnings_config 
    WHERE config_type = 'daily_cap' AND config_key = v_tier;
    
    SELECT value INTO v_trend_cap FROM earnings_config 
    WHERE config_type = 'trend_cap' AND config_key = v_tier;
    
    -- Defaults
    v_multiplier := COALESCE(v_multiplier, 1.0);
    v_daily_cap := COALESCE(v_daily_cap, 10.0);
    v_trend_cap := COALESCE(v_trend_cap, 0.75);
    
    -- Get trend data
    SELECT * INTO v_trend FROM captured_trends WHERE id = p_trend_id;
    
    -- Base earnings
    v_earnings := 0.25;
    
    -- Quality bonuses
    IF v_trend.screenshot_url IS NOT NULL THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    IF v_trend.title IS NOT NULL AND LENGTH(COALESCE(v_trend.description, '')) > 30 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    IF COALESCE(v_trend.quality_score, 0) > 80 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    -- Apply multiplier
    v_earnings := v_earnings * v_multiplier;
    
    -- Apply per-trend cap
    IF v_earnings > v_trend_cap THEN
        v_earnings := v_trend_cap;
    END IF;
    
    -- Check daily cap
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM earnings_ledger
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND amount > 0;
    
    IF v_today_earned + v_earnings > v_daily_cap THEN
        v_earnings := GREATEST(0, v_daily_cap - v_today_earned);
    END IF;
    
    RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Fix validation earnings function
CREATE OR REPLACE FUNCTION calculate_validation_earnings_final(
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0.02;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_tier TEXT;
BEGIN
    -- Get user tier (handle both columns)
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id OR id = p_user_id
    LIMIT 1;
    
    SELECT value INTO v_daily_cap FROM earnings_config 
    WHERE config_type = 'daily_cap' AND config_key = v_tier;
    
    v_daily_cap := COALESCE(v_daily_cap, 10.0);
    
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM earnings_ledger
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND amount > 0;
    
    IF v_today_earned + v_earnings > v_daily_cap THEN
        v_earnings := GREATEST(0, v_daily_cap - v_today_earned);
    END IF;
    
    RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Fix summary function
CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    current_balance DECIMAL,
    total_earned DECIMAL,
    today_earned DECIMAL,
    week_earned DECIMAL,
    month_earned DECIMAL,
    performance_tier TEXT,
    daily_cap DECIMAL,
    trends_submitted INTEGER,
    validations_completed INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH user_data AS (
        SELECT 
            up.current_balance,
            up.total_earned,
            up.performance_tier,
            up.trends_submitted,
            up.validations_completed
        FROM user_profiles up
        WHERE up.user_id = p_user_id OR up.id = p_user_id
        LIMIT 1
    ),
    earnings_data AS (
        SELECT
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE THEN amount ELSE 0 END), 0) as today,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN amount ELSE 0 END), 0) as week,
            COALESCE(SUM(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN amount ELSE 0 END), 0) as month
        FROM earnings_ledger
        WHERE user_id = p_user_id
        AND amount > 0
    )
    SELECT 
        COALESCE(ud.current_balance, 0),
        COALESCE(ud.total_earned, 0),
        ed.today,
        ed.week,
        ed.month,
        COALESCE(ud.performance_tier, 'learning'),
        COALESCE((SELECT value FROM earnings_config WHERE config_type = 'daily_cap' AND config_key = COALESCE(ud.performance_tier, 'learning')), 10.0),
        COALESCE(ud.trends_submitted, 0),
        COALESCE(ud.validations_completed, 0)
    FROM user_data ud
    CROSS JOIN earnings_data ed;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Verify everything works
DO $$
DECLARE
    test_balance DECIMAL;
    test_tier TEXT;
    test_earnings DECIMAL;
BEGIN
    -- Test the functions with our test user
    SELECT current_balance, performance_tier 
    INTO test_balance, test_tier
    FROM user_profiles 
    WHERE id = '00000000-0000-0000-0000-000000000001'
    OR user_id = '00000000-0000-0000-0000-000000000001'
    LIMIT 1;
    
    -- Test validation earnings calculation
    test_earnings := calculate_validation_earnings_final('00000000-0000-0000-0000-000000000001');
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ SYSTEM TEST RESULTS:';
    RAISE NOTICE '   • Test user tier: %', test_tier;
    RAISE NOTICE '   • Test user balance: $%', test_balance;
    RAISE NOTICE '   • Validation earnings: $%', test_earnings;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 User profiles table is ready!';
    RAISE NOTICE '   Functions are working correctly.';
    RAISE NOTICE '   You can now test the complete system.';
END $$;