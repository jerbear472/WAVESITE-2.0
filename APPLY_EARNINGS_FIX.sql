-- =====================================================
-- APPLY EARNINGS FIX - ADAPTIVE VERSION
-- This script adapts to your existing table structure
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CHECK AND CREATE EARNINGS TABLES
-- =====================================================

-- Check which trend table exists and what columns it has
DO $$
DECLARE
    v_table_name TEXT;
    v_user_column TEXT;
BEGIN
    -- Check for captured_trends vs trend_submissions
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'captured_trends') THEN
        v_table_name := 'captured_trends';
        
        -- Check column name (user_id vs spotter_id)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'captured_trends'
                   AND column_name = 'user_id') THEN
            v_user_column := 'user_id';
        ELSE
            v_user_column := 'spotter_id';
        END IF;
        
        RAISE NOTICE 'Using table: captured_trends with column: %', v_user_column;
        
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables 
                  WHERE table_schema = 'public' 
                  AND table_name = 'trend_submissions') THEN
        v_table_name := 'trend_submissions';
        v_user_column := 'spotter_id';
        RAISE NOTICE 'Using table: trend_submissions with column: spotter_id';
    ELSE
        RAISE EXCEPTION 'No trend table found! Please create captured_trends or trend_submissions first.';
    END IF;
END $$;

-- Add required columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS paid_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS today_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add columns to captured_trends (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'captured_trends') THEN
        
        ALTER TABLE captured_trends
        ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'submitted';
    END IF;
END $$;

-- Add columns to trend_submissions (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'trend_submissions') THEN
        
        ALTER TABLE trend_submissions
        ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0.00,
        ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
        ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
        ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending';
        -- status column likely already exists
    END IF;
END $$;

-- Ensure trend_validations has required columns
ALTER TABLE trend_validations
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS is_genuine BOOLEAN;

-- Create earnings_ledger if not exists
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create scroll_sessions table if not exists
CREATE TABLE IF NOT EXISTS scroll_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    trends_submitted INTEGER DEFAULT 0,
    session_earnings DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. DROP OLD FUNCTIONS AND TRIGGERS
-- =====================================================

-- Drop all existing earnings-related triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop triggers on captured_trends
    FOR r IN SELECT trigger_name 
             FROM information_schema.triggers 
             WHERE event_object_table = 'captured_trends' 
             AND trigger_name LIKE '%earning%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON captured_trends', r.trigger_name);
    END LOOP;
    
    -- Drop triggers on trend_submissions
    FOR r IN SELECT trigger_name 
             FROM information_schema.triggers 
             WHERE event_object_table = 'trend_submissions' 
             AND trigger_name LIKE '%earning%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_submissions', r.trigger_name);
    END LOOP;
    
    -- Drop triggers on trend_validations
    FOR r IN SELECT trigger_name 
             FROM information_schema.triggers 
             WHERE event_object_table = 'trend_validations' 
             AND (trigger_name LIKE '%earning%' OR trigger_name LIKE '%validation%')
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_validations', r.trigger_name);
    END LOOP;
END $$;

-- Drop old functions
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_vote() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_status_change() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;

-- =====================================================
-- 3. CREATE MULTIPLIER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE LOWER(COALESCE(p_tier, 'learning'))
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_position >= 5 THEN 2.5
        WHEN p_position = 4 THEN 2.0
        WHEN p_position = 3 THEN 1.5
        WHEN p_position = 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION get_daily_streak_multiplier(p_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_streak >= 30 THEN 2.5
        WHEN p_streak >= 14 THEN 2.0
        WHEN p_streak >= 7 THEN 1.5
        WHEN p_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 4. CREATE EARNINGS CALCULATION FUNCTION (ADAPTIVE)
-- =====================================================

-- This function adapts to both captured_trends and trend_submissions
CREATE OR REPLACE FUNCTION calculate_trend_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25;
    v_tier TEXT;
    v_tier_multiplier DECIMAL(3,2);
    v_daily_streak INTEGER;
    v_daily_multiplier DECIMAL(3,2);
    v_session_position INTEGER;
    v_session_multiplier DECIMAL(3,2);
    v_last_submission TIMESTAMP WITH TIME ZONE;
    v_final_amount DECIMAL(10,2);
    v_active_session_id UUID;
    v_user_id UUID;
BEGIN
    -- Get user_id from appropriate column
    IF TG_TABLE_NAME = 'captured_trends' THEN
        -- Check if user_id column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'captured_trends'
                   AND column_name = 'user_id') THEN
            v_user_id := NEW.user_id;
        ELSE
            v_user_id := NEW.spotter_id;
        END IF;
    ELSE -- trend_submissions
        v_user_id := NEW.spotter_id;
    END IF;
    
    -- Get user profile
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0),
        last_submission_at
    INTO v_tier, v_daily_streak, v_last_submission
    FROM user_profiles 
    WHERE user_id = v_user_id;
    
    -- Create profile if doesn't exist
    IF NOT FOUND THEN
        INSERT INTO user_profiles (user_id, performance_tier, current_streak)
        VALUES (v_user_id, 'learning', 0)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_tier := 'learning';
        v_daily_streak := 0;
        v_last_submission := NULL;
    END IF;
    
    -- Check for active scroll session or create new one
    SELECT id INTO v_active_session_id
    FROM scroll_sessions
    WHERE user_id = v_user_id 
        AND is_active = true
        AND start_time >= NOW() - INTERVAL '5 minutes'
    ORDER BY start_time DESC
    LIMIT 1;
    
    IF v_active_session_id IS NULL THEN
        -- Create new session
        INSERT INTO scroll_sessions (user_id, start_time, trends_submitted)
        VALUES (v_user_id, NOW(), 1)
        RETURNING id INTO v_active_session_id;
        
        v_session_position := 1;
    ELSE
        -- Update existing session
        UPDATE scroll_sessions
        SET trends_submitted = trends_submitted + 1
        WHERE id = v_active_session_id
        RETURNING trends_submitted INTO v_session_position;
    END IF;
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_tier);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(v_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(
        v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 
        2
    );
    
    -- Cap at maximum
    IF v_final_amount > 5.00 THEN
        v_final_amount := 5.00;
    END IF;
    
    -- Set earnings on the trend
    NEW.earnings := v_final_amount;
    NEW.session_position := v_session_position;
    NEW.session_multiplier := v_session_multiplier;
    NEW.daily_multiplier := v_daily_multiplier;
    NEW.tier_multiplier := v_tier_multiplier;
    NEW.earnings_status := 'pending';
    
    -- Update user's pending earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        session_streak = v_session_position,
        last_submission_at = NOW(),
        last_active = NOW()
    WHERE user_id = v_user_id;
    
    -- Update session earnings
    UPDATE scroll_sessions
    SET session_earnings = session_earnings + v_final_amount
    WHERE id = v_active_session_id;
    
    -- Log to earnings ledger
    INSERT INTO earnings_ledger (
        user_id, amount, type, status, description,
        reference_id, reference_type, metadata
    ) VALUES (
        v_user_id,
        v_final_amount,
        'trend_submission',
        'pending',
        format('Trend #%s: $%s × %s(%sx) × session#%s(%sx) × %s-day(%sx) = $%s',
            v_session_position, v_base_amount, v_tier, v_tier_multiplier,
            v_session_position, v_session_multiplier,
            v_daily_streak, v_daily_multiplier, v_final_amount
        ),
        NEW.id,
        TG_TABLE_NAME,
        jsonb_build_object(
            'base', v_base_amount,
            'tier', v_tier,
            'tier_mult', v_tier_multiplier,
            'session_pos', v_session_position,
            'session_mult', v_session_multiplier,
            'daily_streak', v_daily_streak,
            'daily_mult', v_daily_multiplier
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VALIDATION EARNINGS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.10;
    v_tier TEXT;
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
BEGIN
    -- Get validator tier
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_tier
    FROM user_profiles 
    WHERE user_id = NEW.validator_id;
    
    -- Validation earnings are simple: base × tier
    v_tier_multiplier := get_tier_multiplier(v_tier);
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    NEW.reward_amount := v_final_amount;
    
    -- Validation earnings go straight to APPROVED
    UPDATE user_profiles
    SET 
        approved_earnings = COALESCE(approved_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        last_active = NOW()
    WHERE user_id = NEW.validator_id;
    
    -- Log to earnings ledger
    INSERT INTO earnings_ledger (
        user_id, amount, type, status, description,
        reference_id, reference_type
    ) VALUES (
        NEW.validator_id,
        v_final_amount,
        'trend_validation',
        'approved',
        format('Validation: $%s × %s(%sx) = $%s',
            v_base_amount, v_tier, v_tier_multiplier, v_final_amount
        ),
        NEW.id,
        'trend_validations'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. CREATE TRIGGERS CONDITIONALLY
-- =====================================================

-- Create trigger for captured_trends if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'captured_trends') THEN
        
        CREATE TRIGGER calculate_trend_earnings_trigger
            BEFORE INSERT ON captured_trends
            FOR EACH ROW
            EXECUTE FUNCTION calculate_trend_earnings();
            
        RAISE NOTICE 'Created earnings trigger for captured_trends';
    END IF;
END $$;

-- Create trigger for trend_submissions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'trend_submissions') THEN
        
        CREATE TRIGGER calculate_trend_earnings_trigger
            BEFORE INSERT ON trend_submissions
            FOR EACH ROW
            EXECUTE FUNCTION calculate_trend_earnings();
            
        RAISE NOTICE 'Created earnings trigger for trend_submissions';
    END IF;
END $$;

-- Validation earnings trigger
CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_validation_earnings();

-- =====================================================
-- 7. CREATE HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL(10,2),
    approved_earnings DECIMAL(10,2),
    paid_earnings DECIMAL(10,2),
    total_earned DECIMAL(10,2),
    today_earned DECIMAL(10,2),
    performance_tier TEXT,
    current_streak INTEGER,
    session_streak INTEGER,
    next_earning_estimate DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.pending_earnings,
        up.approved_earnings,
        up.paid_earnings,
        up.total_earned,
        up.today_earned,
        up.performance_tier,
        up.current_streak,
        up.session_streak,
        ROUND(
            0.25 * 
            get_tier_multiplier(up.performance_tier) * 
            get_session_streak_multiplier(COALESCE(up.session_streak, 0) + 1) *
            get_daily_streak_multiplier(up.current_streak),
            2
        ) as next_earning_estimate
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 8. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_status 
ON earnings_ledger(user_id, status);

CREATE INDEX IF NOT EXISTS idx_trend_validations_trend 
ON trend_validations(trend_id);

CREATE INDEX IF NOT EXISTS idx_scroll_sessions_user_active 
ON scroll_sessions(user_id, is_active);

-- =====================================================
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_captured_trends_exists BOOLEAN;
    v_trend_submissions_exists BOOLEAN;
BEGIN
    -- Check which tables exist
    SELECT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'captured_trends')
    INTO v_captured_trends_exists;
    
    SELECT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions')
    INTO v_trend_submissions_exists;
    
    RAISE NOTICE '✅ Earnings System Applied Successfully!';
    RAISE NOTICE '📊 Configuration:';
    RAISE NOTICE '  - Base rate: $0.25 per trend';
    RAISE NOTICE '  - Validation: $0.10 per vote';
    RAISE NOTICE '  - Tier multipliers: 0.5x to 3.0x';
    RAISE NOTICE '  - Session multipliers: 1.0x to 2.5x (5 min window)';
    RAISE NOTICE '  - Daily streak multipliers: 1.0x to 2.5x';
    RAISE NOTICE '  - Max per submission: $5.00';
    
    IF v_captured_trends_exists THEN
        RAISE NOTICE '  ✓ Using captured_trends table';
    END IF;
    
    IF v_trend_submissions_exists THEN
        RAISE NOTICE '  ✓ Using trend_submissions table';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Note: This script sets up the basic earnings calculation.';
    RAISE NOTICE '    The pending→approved flow requires additional vote handling logic.';
END $$;

COMMIT;