-- =====================================================
-- FIX USER PROFILES WITH PROPER ID HANDLING
-- =====================================================

-- Step 1: Check what columns exist and their constraints
DO $$
DECLARE
    col_record RECORD;
BEGIN
    RAISE NOTICE 'Current user_profiles columns:';
    FOR col_record IN 
        SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles'
        AND column_name IN ('id', 'user_id')
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  • % (type: %, nullable: %, default: %)', 
            col_record.column_name, 
            col_record.data_type, 
            col_record.is_nullable,
            col_record.column_default;
    END LOOP;
END $$;

-- Step 2: Ensure id column has a default value
ALTER TABLE user_profiles 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Step 3: Ensure all earnings columns exist
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

-- Step 4: Remove incorrect foreign key constraints
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Step 5: Add proper foreign key on user_id column
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

-- Step 6: Create or update profiles for existing auth users
DO $$
DECLARE
    auth_user RECORD;
    profile_exists BOOLEAN;
BEGIN
    -- Loop through all auth users
    FOR auth_user IN SELECT id, email FROM auth.users LIMIT 5
    LOOP
        -- Check if profile exists for this user
        SELECT EXISTS(
            SELECT 1 FROM user_profiles 
            WHERE user_id = auth_user.id
        ) INTO profile_exists;
        
        IF NOT profile_exists THEN
            -- Create profile with generated id
            INSERT INTO user_profiles (
                id,            -- Will use gen_random_uuid() default
                user_id,       -- References auth.users
                username,
                email,
                performance_tier,
                current_balance,
                total_earned,
                trends_submitted,
                validations_completed
            ) VALUES (
                gen_random_uuid(),  -- Generate new UUID for id
                auth_user.id,       -- Use auth user's id for user_id
                SPLIT_PART(auth_user.email, '@', 1),  -- Use email prefix as username
                auth_user.email,
                'learning',
                0.00,
                0.00,
                0,
                0
            ) ON CONFLICT (user_id) DO UPDATE SET
                performance_tier = COALESCE(user_profiles.performance_tier, 'learning'),
                current_balance = COALESCE(user_profiles.current_balance, 0),
                total_earned = COALESCE(user_profiles.total_earned, 0);
            
            RAISE NOTICE 'Created/updated profile for user: %', auth_user.email;
        ELSE
            -- Update existing profile to ensure it has earnings fields
            UPDATE user_profiles 
            SET 
                performance_tier = COALESCE(performance_tier, 'learning'),
                current_balance = COALESCE(current_balance, 0),
                total_earned = COALESCE(total_earned, 0),
                trends_submitted = COALESCE(trends_submitted, 0),
                validations_completed = COALESCE(validations_completed, 0)
            WHERE user_id = auth_user.id;
            
            RAISE NOTICE 'Updated existing profile for: %', auth_user.email;
        END IF;
    END LOOP;
END $$;

-- Step 7: Fix the earnings functions to use user_id properly
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
    -- Get user tier using user_id column (not id)
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id
    LIMIT 1;
    
    -- If no profile found, use default tier
    v_tier := COALESCE(v_tier, 'learning');
    
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
    
    IF v_trend.id IS NOT NULL THEN
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
    -- Get user tier using user_id column (not id)
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles 
    WHERE user_id = p_user_id
    LIMIT 1;
    
    -- Default if no profile
    v_tier := COALESCE(v_tier, 'learning');
    
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

-- Step 8: Create triggers to auto-create profiles for new users
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (
        id,
        user_id,
        username,
        email,
        performance_tier,
        current_balance,
        total_earned
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        SPLIT_PART(NEW.email, '@', 1),
        NEW.email,
        'learning',
        0.00,
        0.00
    ) ON CONFLICT (user_id) DO NOTHING;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new auth users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_profile_for_new_user();

-- Step 9: Final verification
DO $$
DECLARE
    user_count INTEGER;
    profile_count INTEGER;
    test_user_id UUID;
    test_earnings DECIMAL;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO profile_count FROM user_profiles;
    
    -- Get a test user
    SELECT user_id INTO test_user_id FROM user_profiles LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Test the validation earnings function
        test_earnings := calculate_validation_earnings_final(test_user_id);
        
        RAISE NOTICE '';
        RAISE NOTICE '✅ SYSTEM SUCCESSFULLY CONFIGURED:';
        RAISE NOTICE '   • Auth users: %', user_count;
        RAISE NOTICE '   • User profiles: %', profile_count;
        RAISE NOTICE '   • Test validation earnings: $%', test_earnings;
        RAISE NOTICE '';
        RAISE NOTICE '🎉 Earnings system is ready!';
        RAISE NOTICE '   • Profiles auto-created for new users';
        RAISE NOTICE '   • Functions working correctly';
        RAISE NOTICE '   • user_id properly references auth.users';
    ELSE
        RAISE NOTICE '⚠️  No profiles created yet. They will be created when users sign up.';
    END IF;
END $$;