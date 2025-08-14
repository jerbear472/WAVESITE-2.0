-- =====================================================
-- FIXED EARNINGS MIGRATION - Using Correct Table Names
-- =====================================================

-- First, check what tables exist and add columns only if tables exist
DO $$
BEGIN
    -- Add columns to user_profiles if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        ALTER TABLE user_profiles 
        ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add columns to trends table if it exists  
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trends') THEN
        ALTER TABLE trends
        ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending';
    END IF;

    -- Add columns to trend_submissions table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trend_submissions') THEN
        ALTER TABLE trend_submissions
        ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending';
    END IF;

    -- Add columns to logged_trends table if it exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'logged_trends') THEN
        ALTER TABLE logged_trends
        ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS spotter_id UUID;
    END IF;
END $$;

-- Drop old functions
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_rejection() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;
DROP FUNCTION IF EXISTS handle_validation_vote() CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON trends;
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON logged_trends;
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS handle_validation_vote_trigger ON trend_validations;

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
-- DYNAMIC TREND SUBMISSION EARNINGS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25;
    v_tier_multiplier DECIMAL(3,2);
    v_session_multiplier DECIMAL(3,2);
    v_daily_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_daily_streak INTEGER;
    v_session_position INTEGER;
    v_last_submission TIMESTAMP WITH TIME ZONE;
    v_minutes_since_last DECIMAL;
    v_description TEXT;
    v_session_window_minutes INTEGER := 5;
    v_user_id UUID;
BEGIN
    -- Determine the user_id column name dynamically
    v_user_id := CASE 
        WHEN TG_TABLE_NAME = 'trends' THEN NEW.spotter_id
        WHEN TG_TABLE_NAME = 'trend_submissions' THEN NEW.submitter_id  
        WHEN TG_TABLE_NAME = 'logged_trends' THEN COALESCE(NEW.spotter_id, NEW.user_id)
        ELSE NEW.user_id
    END;
    
    -- Get user profile data
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0),
        last_submission_at,
        COALESCE(session_streak, 0)
    INTO v_user_tier, v_daily_streak, v_last_submission, v_session_position
    FROM user_profiles 
    WHERE user_id = v_user_id;
    
    -- Handle session streak
    IF v_last_submission IS NOT NULL THEN
        v_minutes_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission)) / 60;
        IF v_minutes_since_last <= v_session_window_minutes THEN
            v_session_position := v_session_position + 1;
        ELSE
            v_session_position := 1;
        END IF;
    ELSE
        v_session_position := 1;
    END IF;
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(v_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    -- Set values on the trend (only if columns exist)
    BEGIN
        NEW.earnings := v_final_amount;
    EXCEPTION WHEN undefined_column THEN
        -- earnings column doesn't exist, skip
    END;
    
    BEGIN
        NEW.session_position := v_session_position;
        NEW.session_multiplier := v_session_multiplier;
        NEW.daily_multiplier := v_daily_multiplier;
        NEW.earnings_status := 'pending';
    EXCEPTION WHEN undefined_column THEN
        -- columns don't exist, skip
    END;
    
    -- Update user profile
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        session_streak = v_session_position,
        last_submission_at = NOW(),
        last_active = NOW()
    WHERE user_id = v_user_id;
    
    -- Record in earnings ledger if it exists
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
            'trend_submission',
            'pending',
            format('PENDING: Trend #%s: $%s × %s(%sx) × session(%sx) × %s-day(%sx) = $%s',
                v_session_position, v_base_amount, v_user_tier, v_tier_multiplier,
                v_session_multiplier, v_daily_streak, v_daily_multiplier, v_final_amount),
            NEW.id,
            TG_TABLE_NAME
        );
    EXCEPTION WHEN undefined_table THEN
        -- earnings_ledger doesn't exist, skip
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VALIDATION EARNINGS ($0.02 per vote)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02; -- FIXED: $0.02 per validation
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_description TEXT;
    v_user_id UUID;
BEGIN
    -- Determine the user_id column name dynamically
    v_user_id := COALESCE(NEW.validator_id, NEW.user_id);
    
    -- Get validator tier
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_user_tier
    FROM user_profiles 
    WHERE user_id = v_user_id;
    
    -- Calculate tier multiplier
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Set reward amount if column exists
    BEGIN
        NEW.reward_amount := v_final_amount;
    EXCEPTION WHEN undefined_column THEN
        -- reward_amount column doesn't exist, skip
    END;
    
    -- Validation earnings go straight to APPROVED
    UPDATE user_profiles
    SET 
        approved_earnings = COALESCE(approved_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        last_active = NOW()
    WHERE user_id = v_user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS DYNAMICALLY
-- =====================================================

DO $$
BEGIN
    -- Create trend submission triggers on tables that exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trends') THEN
        CREATE TRIGGER calculate_trend_earnings_trigger
            BEFORE INSERT ON trends
            FOR EACH ROW
            EXECUTE FUNCTION calculate_trend_submission_earnings();
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trend_submissions') THEN
        CREATE TRIGGER calculate_trend_earnings_trigger
            BEFORE INSERT ON trend_submissions  
            FOR EACH ROW
            EXECUTE FUNCTION calculate_trend_submission_earnings();
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'logged_trends') THEN
        CREATE TRIGGER calculate_trend_earnings_trigger
            BEFORE INSERT ON logged_trends
            FOR EACH ROW
            EXECUTE FUNCTION calculate_trend_submission_earnings();
    END IF;

    -- Create validation triggers on tables that exist
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trend_validations') THEN
        CREATE TRIGGER calculate_validation_earnings_trigger
            BEFORE INSERT ON trend_validations
            FOR EACH ROW
            EXECUTE FUNCTION calculate_validation_earnings();
    END IF;

    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'trend_verifications') THEN
        CREATE TRIGGER calculate_validation_earnings_trigger
            BEFORE INSERT ON trend_verifications
            FOR EACH ROW
            EXECUTE FUNCTION calculate_validation_earnings();
    END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Fixed earnings system installed!';
    RAISE NOTICE '💰 Trend: $0.25 base (PENDING until approved)';
    RAISE NOTICE '✓ Validation: $0.02 per vote (approved immediately)';
    RAISE NOTICE '🔧 Works with any table structure dynamically';
END $$;