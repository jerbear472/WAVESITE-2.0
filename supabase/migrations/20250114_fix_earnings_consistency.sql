-- =====================================================
-- EARNINGS CONSISTENCY FIX
-- Base rate: $0.25 per trend
-- Applies tier and streak multipliers
-- =====================================================

-- Drop all old earning functions to start fresh
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_earnings CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_earnings_v2 CASCADE;
DROP FUNCTION IF EXISTS add_earnings CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS on_trend_submission_earnings ON captured_trends;
DROP TRIGGER IF EXISTS on_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings ON captured_trends;
DROP TRIGGER IF EXISTS trigger_validation_earnings ON trend_validations;

-- =====================================================
-- CORE EARNING CALCULATION FUNCTIONS
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

-- Calculate streak multiplier
CREATE OR REPLACE FUNCTION get_streak_multiplier(p_streak INTEGER)
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
-- TREND SUBMISSION EARNINGS
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25; -- CORRECT BASE RATE
    v_tier_multiplier DECIMAL(3,2);
    v_streak_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_user_streak INTEGER;
    v_description TEXT;
BEGIN
    -- Get user tier and streak
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0)
    INTO v_user_tier, v_user_streak
    FROM user_profiles 
    WHERE user_id = NEW.spotter_id;
    
    -- If no profile exists, create one with defaults
    IF v_user_tier IS NULL THEN
        INSERT INTO user_profiles (user_id, performance_tier, current_streak)
        VALUES (NEW.spotter_id, 'learning', 0)
        ON CONFLICT (user_id) DO NOTHING;
        
        v_user_tier := 'learning';
        v_user_streak := 0;
    END IF;
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_streak_multiplier := get_streak_multiplier(v_user_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_streak_multiplier, 2);
    
    -- Set the earnings on the trend
    NEW.earnings := v_final_amount;
    
    -- Build description
    v_description := format(
        'Trend submission: $%s base × %s tier (%sx) × %s day streak (%sx) = $%s',
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_user_streak,
        v_streak_multiplier,
        v_final_amount
    );
    
    -- Update user's earnings in profile
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
            'streak', v_user_streak,
            'streak_multiplier', v_streak_multiplier
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VALIDATION EARNINGS
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
-- APPROVAL BONUS (when trend gets approved)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus_amount DECIMAL(10,2) := 0.50; -- Approval bonus
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_description TEXT;
BEGIN
    -- Only process if status changed to 'approved'
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Get spotter tier
        SELECT COALESCE(performance_tier, 'learning')
        INTO v_user_tier
        FROM user_profiles 
        WHERE user_id = NEW.spotter_id;
        
        -- Calculate tier multiplier
        v_tier_multiplier := get_tier_multiplier(v_user_tier);
        
        -- Calculate final bonus
        v_final_amount := ROUND(v_bonus_amount * v_tier_multiplier, 2);
        
        -- Build description
        v_description := format(
            'Approval bonus: $%s × %s tier (%sx) = $%s',
            v_bonus_amount,
            v_user_tier,
            v_tier_multiplier,
            v_final_amount
        );
        
        -- Update user's earnings
        UPDATE user_profiles
        SET 
            pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
            total_earned = COALESCE(total_earned, 0) + v_final_amount,
            approved_trends = COALESCE(approved_trends, 0) + 1,
            approval_rate = CASE 
                WHEN trends_submitted > 0 
                THEN ROUND((COALESCE(approved_trends, 0) + 1)::DECIMAL / trends_submitted, 2)
                ELSE 0
            END
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
            'approval_bonus',
            'pending',
            v_description,
            NEW.id,
            'captured_trends',
            jsonb_build_object(
                'bonus_amount', v_bonus_amount,
                'tier', v_user_tier,
                'tier_multiplier', v_tier_multiplier
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATE STREAK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_last_submission TIMESTAMP;
    v_current_streak INTEGER;
    v_hours_since_last INTEGER;
BEGIN
    -- Get last submission time and current streak
    SELECT last_active, current_streak
    INTO v_last_submission, v_current_streak
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate hours since last submission
    v_hours_since_last := EXTRACT(EPOCH FROM (NOW() - v_last_submission)) / 3600;
    
    -- Update streak based on time gap
    IF v_hours_since_last IS NULL OR v_hours_since_last > 48 THEN
        -- Reset streak if more than 48 hours
        UPDATE user_profiles
        SET current_streak = 1
        WHERE user_id = p_user_id;
    ELSIF v_hours_since_last < 24 THEN
        -- Same day, don't increase streak
        NULL;
    ELSE
        -- Next day, increase streak
        UPDATE user_profiles
        SET current_streak = COALESCE(current_streak, 0) + 1
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

-- Approval bonus trigger
CREATE TRIGGER handle_trend_approval_trigger
    AFTER UPDATE ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- =====================================================
-- HELPER FUNCTION TO GET USER EARNINGS SUMMARY
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL,
    approved_earnings DECIMAL,
    total_earned DECIMAL,
    today_earned DECIMAL,
    current_tier TEXT,
    current_streak INTEGER,
    tier_multiplier DECIMAL,
    streak_multiplier DECIMAL,
    next_earning DECIMAL
) AS $$
DECLARE
    v_tier TEXT;
    v_streak INTEGER;
BEGIN
    -- Get user tier and streak
    SELECT performance_tier, current_streak
    INTO v_tier, v_streak
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    RETURN QUERY
    SELECT 
        up.pending_earnings,
        up.approved_earnings,
        up.total_earned,
        up.today_earned,
        up.performance_tier::TEXT,
        up.current_streak,
        get_tier_multiplier(up.performance_tier),
        get_streak_multiplier(up.current_streak),
        ROUND(0.25 * get_tier_multiplier(up.performance_tier) * get_streak_multiplier(up.current_streak), 2) as next_earning
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION get_streak_multiplier TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streak TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- =====================================================
-- FIX EXISTING DATA (optional - comment out if not needed)
-- =====================================================

-- Update any trends with incorrect earnings
UPDATE captured_trends ct
SET earnings = ROUND(
    0.25 * 
    get_tier_multiplier(COALESCE(up.performance_tier, 'learning')) * 
    get_streak_multiplier(COALESCE(up.current_streak, 0)),
    2
)
FROM user_profiles up
WHERE ct.spotter_id = up.user_id
AND ct.created_at >= NOW() - INTERVAL '7 days'; -- Only fix recent trends

-- Recalculate user totals based on earnings ledger
UPDATE user_profiles up
SET 
    pending_earnings = (
        SELECT COALESCE(SUM(amount), 0)
        FROM earnings_ledger
        WHERE user_id = up.user_id
        AND status = 'pending'
    ),
    total_earned = (
        SELECT COALESCE(SUM(amount), 0)
        FROM earnings_ledger
        WHERE user_id = up.user_id
    );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_status 
ON earnings_ledger(user_id, status);

CREATE INDEX IF NOT EXISTS idx_captured_trends_spotter_created 
ON captured_trends(spotter_id, created_at DESC);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Earnings consistency fix applied successfully!';
    RAISE NOTICE '📊 Base rates: Trend=$0.25, Validation=$0.10, Approval Bonus=$0.50';
    RAISE NOTICE '🎯 Multipliers: Tier (0.5x-3.0x) × Streak (1.0x-2.5x)';
END $$;