-- =====================================================
-- EARNINGS CONSISTENCY FIX WITH DUAL STREAK SYSTEM
-- Base rate: $0.25 per trend
-- Applies tier, session streak, and daily streak multipliers
-- =====================================================

-- Add missing columns if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE captured_trends
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- Drop all old earning functions to start fresh
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON captured_trends;
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations;

-- =====================================================
-- MULTIPLIER CALCULATION FUNCTIONS
-- =====================================================

-- Calculate tier multiplier
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

-- Calculate session streak multiplier (rapid submissions)
CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_session_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_session_position >= 5 THEN 2.5  -- 5+ rapid submissions
        WHEN p_session_position = 4 THEN 2.0   -- 4th submission
        WHEN p_session_position = 3 THEN 1.5   -- 3rd submission
        WHEN p_session_position = 2 THEN 1.2   -- 2nd submission
        ELSE 1.0                                -- First submission
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate daily streak multiplier (consecutive days)
CREATE OR REPLACE FUNCTION get_daily_streak_multiplier(p_daily_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_daily_streak >= 30 THEN 2.5  -- 30+ days
        WHEN p_daily_streak >= 14 THEN 2.0  -- 14-29 days
        WHEN p_daily_streak >= 7 THEN 1.5   -- 7-13 days
        WHEN p_daily_streak >= 2 THEN 1.2   -- 2-6 days
        ELSE 1.0                             -- 0-1 days
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- TREND SUBMISSION EARNINGS WITH DUAL STREAKS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25; -- Base rate
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
    v_session_window_minutes INTEGER := 5; -- 5 minute window for session streak
BEGIN
    -- Get user profile data
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0),
        last_submission_at,
        COALESCE(session_streak, 0)
    INTO v_user_tier, v_daily_streak, v_last_submission, v_session_position
    FROM user_profiles 
    WHERE user_id = NEW.spotter_id;
    
    -- If no profile exists, create one
    IF v_user_tier IS NULL THEN
        INSERT INTO user_profiles (user_id, performance_tier, current_streak, session_streak)
        VALUES (NEW.spotter_id, 'learning', 0, 1)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_user_tier := 'learning';
        v_daily_streak := 0;
        v_session_position := 1;
    ELSE
        -- Calculate time since last submission
        IF v_last_submission IS NOT NULL THEN
            v_minutes_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission)) / 60;
            
            -- Determine session position
            IF v_minutes_since_last <= v_session_window_minutes THEN
                -- Within session window, increment position
                v_session_position := v_session_position + 1;
            ELSE
                -- New session
                v_session_position := 1;
            END IF;
        ELSE
            -- First submission ever
            v_session_position := 1;
        END IF;
    END IF;
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(v_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    -- Set values on the trend record
    NEW.earnings := v_final_amount;
    NEW.session_position := v_session_position;
    NEW.session_multiplier := v_session_multiplier;
    NEW.daily_multiplier := v_daily_multiplier;
    
    -- Build description
    v_description := format(
        'Trend #%s in session: $%s × %s tier (%sx) × session (%sx) × %s-day streak (%sx) = $%s',
        v_session_position,
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_session_multiplier,
        v_daily_streak,
        v_daily_multiplier,
        v_final_amount
    );
    
    -- Update user profile
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        session_streak = v_session_position,
        last_submission_at = NOW(),
        last_active = NOW()
    WHERE user_id = NEW.spotter_id;
    
    -- Record in earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.spotter_id,
        v_final_amount,
        'trend_submission',
        'pending',
        v_description,
        NEW.id,
        'captured_trends',
        jsonb_build_object(
            'base_amount', v_base_amount,
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'session_position', v_session_position,
            'session_multiplier', v_session_multiplier,
            'daily_streak', v_daily_streak,
            'daily_multiplier', v_daily_multiplier
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VALIDATION EARNINGS (simplified, no session streak)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.10; -- Validation base rate
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_description TEXT;
BEGIN
    -- Get validator tier
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_user_tier
    FROM user_profiles 
    WHERE user_id = NEW.validator_id;
    
    -- Calculate tier multiplier (no streak multiplier for validations)
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Set the reward amount
    NEW.reward_amount := v_final_amount;
    
    -- Build description
    v_description := format(
        'Validation vote: $%s base × %s tier (%sx) = $%s',
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_final_amount
    );
    
    -- Update user's earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        last_active = NOW()
    WHERE user_id = NEW.validator_id;
    
    -- Record in earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.validator_id,
        v_final_amount,
        'trend_validation',
        'pending',
        v_description,
        NEW.id,
        'trend_validations',
        jsonb_build_object(
            'base_amount', v_base_amount,
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'trend_id', NEW.trend_id
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE DAILY STREAK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_daily_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_active DATE;
    v_current_streak INTEGER;
    v_days_since_last INTEGER;
BEGIN
    -- Get last active date and current streak
    SELECT DATE(last_active), current_streak
    INTO v_last_active, v_current_streak
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate days since last activity
    IF v_last_active IS NOT NULL THEN
        v_days_since_last := CURRENT_DATE - v_last_active;
        
        IF v_days_since_last = 0 THEN
            -- Same day, don't change streak
            NULL;
        ELSIF v_days_since_last = 1 THEN
            -- Next day, increment streak
            UPDATE user_profiles
            SET current_streak = COALESCE(current_streak, 0) + 1
            WHERE user_id = p_user_id;
        ELSE
            -- Missed a day, reset streak
            UPDATE user_profiles
            SET current_streak = 1
            WHERE user_id = p_user_id;
        END IF;
    ELSE
        -- First activity
        UPDATE user_profiles
        SET current_streak = 1
        WHERE user_id = p_user_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trend submission trigger
CREATE TRIGGER calculate_trend_earnings_trigger
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trend_submission_earnings();

-- Validation trigger
CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_validation_earnings();

-- =====================================================
-- HELPER FUNCTION FOR EARNINGS SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL,
    approved_earnings DECIMAL,
    total_earned DECIMAL,
    today_earned DECIMAL,
    current_tier TEXT,
    daily_streak INTEGER,
    session_streak INTEGER,
    tier_multiplier DECIMAL,
    next_session_multiplier DECIMAL,
    daily_multiplier DECIMAL,
    next_earning_estimate DECIMAL
) AS $$
DECLARE
    v_tier TEXT;
    v_daily_streak INTEGER;
    v_session_streak INTEGER;
    v_next_session INTEGER;
BEGIN
    -- Get user data
    SELECT 
        performance_tier, 
        current_streak,
        COALESCE(session_streak, 0)
    INTO v_tier, v_daily_streak, v_session_streak
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate next session position
    v_next_session := LEAST(v_session_streak + 1, 5); -- Cap at 5 for multiplier
    
    RETURN QUERY
    SELECT 
        up.pending_earnings,
        up.approved_earnings,
        up.total_earned,
        up.today_earned,
        up.performance_tier::TEXT,
        up.current_streak,
        up.session_streak,
        get_tier_multiplier(up.performance_tier),
        get_session_streak_multiplier(v_next_session),
        get_daily_streak_multiplier(up.current_streak),
        ROUND(
            0.25 * 
            get_tier_multiplier(up.performance_tier) * 
            get_session_streak_multiplier(v_next_session) *
            get_daily_streak_multiplier(up.current_streak), 
            2
        ) as next_earning_estimate
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_streak TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_submission_tracking 
ON user_profiles(user_id, last_submission_at);

CREATE INDEX IF NOT EXISTS idx_captured_trends_session 
ON captured_trends(spotter_id, created_at DESC, session_position);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Dual streak earnings system installed successfully!';
    RAISE NOTICE '📊 Base rate: $0.25';
    RAISE NOTICE '🎯 Tier multipliers: 0.5x-3.0x';
    RAISE NOTICE '🔥 Session streak multipliers: 1.0x-2.5x (rapid submissions)';
    RAISE NOTICE '📅 Daily streak multipliers: 1.0x-2.5x (consecutive days)';
    RAISE NOTICE '💰 Max possible: $0.25 × 3.0 × 2.5 × 2.5 = $4.69';
END $$;