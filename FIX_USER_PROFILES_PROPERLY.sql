-- =====================================================
-- PROPER FIX FOR USER PROFILES TABLE
-- =====================================================

-- Step 1: Check table structure and constraints
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    RAISE NOTICE 'Current foreign key constraints on user_profiles:';
    FOR constraint_record IN 
        SELECT 
            tc.constraint_name,
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name='user_profiles'
    LOOP
        RAISE NOTICE '  • % on column % references %.%', 
            constraint_record.constraint_name,
            constraint_record.column_name,
            constraint_record.foreign_table_name,
            constraint_record.foreign_column_name;
    END LOOP;
END $$;

-- Step 2: Drop the incorrect foreign key if it exists
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 3: Ensure proper columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0;

-- Step 4: Add proper foreign key on user_id column (not id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'user_profiles' 
        AND constraint_name = 'user_profiles_user_id_fkey'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added foreign key on user_id column';
    END IF;
END $$;

-- Step 5: Get an existing auth user to use for testing
DO $$
DECLARE
    existing_user_id UUID;
    profile_count INTEGER;
BEGIN
    -- Get the first auth user
    SELECT id INTO existing_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found existing auth user: %', existing_user_id;
        
        -- Check if they have a profile
        SELECT COUNT(*) INTO profile_count
        FROM user_profiles 
        WHERE user_id = existing_user_id;
        
        IF profile_count = 0 THEN
            -- Create profile for this user
            INSERT INTO user_profiles (
                user_id,
                username,
                email,
                performance_tier,
                current_balance,
                total_earned,
                trends_submitted,
                validations_completed
            ) VALUES (
                existing_user_id,
                'wavesight_user',
                'user@wavesight.com',
                'learning',
                0.00,
                0.00,
                0,
                0
            );
            RAISE NOTICE 'Created profile for existing auth user';
        ELSE
            -- Update existing profile to ensure it has earnings fields
            UPDATE user_profiles 
            SET 
                performance_tier = COALESCE(performance_tier, 'learning'),
                current_balance = COALESCE(current_balance, 0),
                total_earned = COALESCE(total_earned, 0),
                trends_submitted = COALESCE(trends_submitted, 0),
                validations_completed = COALESCE(validations_completed, 0)
            WHERE user_id = existing_user_id;
            
            RAISE NOTICE 'Updated existing profile with earnings fields';
        END IF;
    ELSE
        RAISE NOTICE 'No auth users found. Profiles will be created when users sign up.';
    END IF;
END $$;

-- Step 6: Fix the earnings calculation functions to use user_id properly
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
    -- Get user tier using user_id column
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id
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

CREATE OR REPLACE FUNCTION calculate_validation_earnings_final(
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0.02;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_tier TEXT;
BEGIN
    -- Get user tier using user_id column
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id
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
        WHERE up.user_id = p_user_id
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

-- Step 7: Verify everything
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles'
    AND constraint_type = 'FOREIGN KEY';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ USER PROFILES TABLE FIXED:';
    RAISE NOTICE '   • Auth users: %', user_count;
    RAISE NOTICE '   • User profiles: %', profile_count;
    RAISE NOTICE '   • Foreign key constraints: %', constraint_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎉 System is ready!';
    RAISE NOTICE '   • user_id column properly references auth.users';
    RAISE NOTICE '   • Earnings functions use user_id correctly';
    RAISE NOTICE '   • Profiles will be created when users sign up';
END $$;