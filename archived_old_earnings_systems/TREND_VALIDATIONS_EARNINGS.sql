-- =====================================================
-- EARNINGS SYSTEM FOR TREND_VALIDATIONS TABLE
-- =====================================================

-- Drop old functions
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations;

-- Check trend_validations structure
DO $$
BEGIN
    RAISE NOTICE 'Checking trend_validations table structure...';
    
    -- Show columns
    PERFORM column_name 
    FROM information_schema.columns 
    WHERE table_name = 'trend_validations' 
    AND table_schema = 'public';
    
    IF NOT FOUND THEN
        RAISE NOTICE 'trend_validations table not found!';
    ELSE
        RAISE NOTICE 'trend_validations table exists';
    END IF;
END $$;

-- Add earnings columns to trend_validations if they don't exist
ALTER TABLE trend_validations 
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'approved';

-- Try to add earnings columns to user_profiles if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added earnings columns to user_profiles';
    ELSE
        RAISE NOTICE 'user_profiles table not found - will create earnings functions without it';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not modify user_profiles: %', SQLERRM;
END $$;

-- =====================================================
-- MULTIPLIER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_session_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_session_position >= 5 THEN 2.5
        WHEN p_session_position = 4 THEN 2.0
        WHEN p_session_position = 3 THEN 1.5
        WHEN p_session_position = 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_daily_streak_multiplier(p_daily_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_daily_streak >= 30 THEN 2.5
        WHEN p_daily_streak >= 14 THEN 2.0
        WHEN p_daily_streak >= 7 THEN 1.5
        WHEN p_daily_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- VALIDATION EARNINGS TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02; -- FIXED: $0.02 per validation
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT := 'learning'; -- Default tier
    v_description TEXT;
    v_user_id UUID;
    v_user_profiles_exists BOOLEAN;
BEGIN
    -- Determine user ID from available columns
    v_user_id := COALESCE(NEW.validator_id, NEW.user_id);
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'No user ID found in trend_validations record';
        RETURN NEW;
    END IF;
    
    -- Check if user_profiles table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO v_user_profiles_exists;
    
    -- Get user tier if user_profiles exists
    IF v_user_profiles_exists THEN
        SELECT COALESCE(performance_tier, 'learning')
        INTO v_user_tier
        FROM user_profiles 
        WHERE user_id = v_user_id;
        
        IF v_user_tier IS NULL THEN
            v_user_tier := 'learning';
        END IF;
    END IF;
    
    -- Calculate tier multiplier
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Set reward amount
    NEW.reward_amount := v_final_amount;
    NEW.earnings_status := 'approved'; -- Validations are approved immediately
    
    -- Build description
    v_description := format(
        'Validation vote: $%s × %s tier (%sx) = $%s',
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_final_amount
    );
    
    -- Update user_profiles if it exists
    IF v_user_profiles_exists THEN
        -- Insert or update user profile
        INSERT INTO user_profiles (user_id, approved_earnings, total_earned, performance_tier)
        VALUES (v_user_id, v_final_amount, v_final_amount, 'learning')
        ON CONFLICT (user_id) DO UPDATE SET
            approved_earnings = COALESCE(user_profiles.approved_earnings, 0) + v_final_amount,
            total_earned = COALESCE(user_profiles.total_earned, 0) + v_final_amount,
            last_active = NOW();
            
        RAISE NOTICE 'Updated user % earnings: +$%', v_user_id, v_final_amount;
    END IF;
    
    -- Try to insert into earnings_ledger if it exists
    BEGIN
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            reference_id,
            reference_type
        ) VALUES (
            v_user_id,
            v_final_amount,
            'trend_validation',
            'approved',
            v_description,
            NEW.id,
            'trend_validations'
        );
    EXCEPTION WHEN undefined_table THEN
        RAISE NOTICE 'earnings_ledger table does not exist - skipping ledger entry';
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGER
-- =====================================================

CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_validation_earnings();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to manually add validation earnings
CREATE OR REPLACE FUNCTION add_validation_earnings(
    p_user_id UUID,
    p_tier TEXT DEFAULT 'learning'
) RETURNS DECIMAL AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02;
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_profiles_exists BOOLEAN;
BEGIN
    v_tier_multiplier := get_tier_multiplier(p_tier);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Check if user_profiles exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_profiles' AND table_schema = 'public'
    ) INTO v_user_profiles_exists;
    
    IF v_user_profiles_exists THEN
        INSERT INTO user_profiles (user_id, approved_earnings, total_earned)
        VALUES (p_user_id, v_final_amount, v_final_amount)
        ON CONFLICT (user_id) DO UPDATE SET
            approved_earnings = COALESCE(user_profiles.approved_earnings, 0) + v_final_amount,
            total_earned = COALESCE(user_profiles.total_earned, 0) + v_final_amount,
            last_active = NOW();
    END IF;
    
    RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION add_validation_earnings TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Validation earnings system installed!';
    RAISE NOTICE '💰 Validation rate: $0.02 base (was $0.10)';
    RAISE NOTICE '✓ Tier multipliers: 0.5x to 3.0x';
    RAISE NOTICE '🎯 Earnings added automatically on trend_validations INSERT';
    RAISE NOTICE '📊 Manual function: add_validation_earnings(user_id, tier)';
    RAISE NOTICE '📋 Check complete schema with CHECK_COMPLETE_SCHEMA.sql';
END $$;