-- =====================================================
-- COMPLETE EARNINGS SYSTEM WITH PENDING/APPROVED LOGIC
-- 
-- Earnings Flow:
-- 1. Trend submission → PENDING earnings (not paid yet)
-- 2. Gets 2 YES votes → APPROVED earnings (can be cashed out)
-- 3. Gets 2 NO votes → CANCELLED (pending earnings removed)
-- 
-- Base Rates:
-- - Trend: $0.25 (pending until approved)
-- - Validation: $0.02 (paid immediately)
-- - Approval Bonus: $0.50 (when trend approved)
-- =====================================================

-- Add necessary columns if they don't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS session_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE captured_trends
ADD COLUMN IF NOT EXISTS session_position INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS daily_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS yes_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS no_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending'; -- pending, approved, cancelled

-- Drop old functions
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;
DROP FUNCTION IF EXISTS handle_trend_rejection() CASCADE;
DROP FUNCTION IF EXISTS get_tier_multiplier(TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_daily_streak_multiplier(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_user_earnings_summary(UUID) CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS calculate_trend_earnings_trigger ON captured_trends;
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON captured_trends;
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
-- TREND SUBMISSION (CREATES PENDING EARNINGS)
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
    v_session_window_minutes INTEGER := 5;
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
    
    -- Set values on the trend
    NEW.earnings := v_final_amount;
    NEW.session_position := v_session_position;
    NEW.session_multiplier := v_session_multiplier;
    NEW.daily_multiplier := v_daily_multiplier;
    NEW.earnings_status := 'pending'; -- IMPORTANT: Starts as pending
    
    -- Build description
    v_description := format(
        'PENDING: Trend submission #%s: $%s × %s(%sx) × session(%sx) × %s-day(%sx) = $%s',
        v_session_position,
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_session_multiplier,
        v_daily_streak,
        v_daily_multiplier,
        v_final_amount
    );
    
    -- Update user's PENDING earnings (not approved yet!)
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        session_streak = v_session_position,
        last_submission_at = NOW(),
        last_active = NOW()
    WHERE user_id = NEW.spotter_id;
    
    -- Record in earnings ledger as PENDING
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
        'pending', -- IMPORTANT: Pending status
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
-- VALIDATION EARNINGS ($0.02 per vote, paid immediately)
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.02; -- FIXED: $0.02 per validation
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
    
    -- Calculate tier multiplier (no streak for validations)
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Set the reward amount
    NEW.reward_amount := v_final_amount;
    
    -- Build description
    v_description := format(
        'Validation vote: $%s × %s tier (%sx) = $%s',
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_final_amount
    );
    
    -- Validation earnings go straight to APPROVED (can cash out immediately)
    UPDATE user_profiles
    SET 
        approved_earnings = COALESCE(approved_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        last_active = NOW()
    WHERE user_id = NEW.validator_id;
    
    -- Record in earnings ledger as APPROVED
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type
    ) VALUES (
        NEW.validator_id,
        v_final_amount,
        'trend_validation',
        'approved', -- Validations are approved immediately
        v_description,
        NEW.id,
        'trend_validations'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- HANDLE VALIDATION VOTES (Track YES/NO, trigger approval/rejection)
-- =====================================================

CREATE OR REPLACE FUNCTION handle_validation_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_yes_votes INTEGER;
    v_no_votes INTEGER;
    v_trend_earnings DECIMAL(10,2);
    v_spotter_id UUID;
    v_approval_bonus DECIMAL(10,2);
    v_user_tier TEXT;
BEGIN
    -- Update vote counts on the trend
    IF NEW.is_genuine = true THEN
        UPDATE captured_trends
        SET yes_votes = COALESCE(yes_votes, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING yes_votes, no_votes, earnings, spotter_id
        INTO v_yes_votes, v_no_votes, v_trend_earnings, v_spotter_id;
    ELSE
        UPDATE captured_trends
        SET no_votes = COALESCE(no_votes, 0) + 1
        WHERE id = NEW.trend_id
        RETURNING yes_votes, no_votes, earnings, spotter_id
        INTO v_yes_votes, v_no_votes, v_trend_earnings, v_spotter_id;
    END IF;
    
    -- Check if trend should be APPROVED (2+ YES votes)
    IF v_yes_votes >= 2 AND (SELECT earnings_status FROM captured_trends WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark trend as approved
        UPDATE captured_trends
        SET 
            earnings_status = 'approved',
            status = 'approved'
        WHERE id = NEW.trend_id;
        
        -- Move earnings from pending to approved
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_trend_earnings),
            approved_earnings = COALESCE(approved_earnings, 0) + v_trend_earnings
        WHERE user_id = v_spotter_id;
        
        -- Update earnings ledger
        UPDATE earnings_ledger
        SET status = 'approved'
        WHERE reference_id = NEW.trend_id
        AND reference_type = 'captured_trends'
        AND status = 'pending';
        
        -- Calculate and add approval bonus
        SELECT performance_tier INTO v_user_tier
        FROM user_profiles WHERE user_id = v_spotter_id;
        
        v_approval_bonus := ROUND(0.50 * get_tier_multiplier(v_user_tier), 2);
        
        -- Add approval bonus to approved earnings
        UPDATE user_profiles
        SET 
            approved_earnings = COALESCE(approved_earnings, 0) + v_approval_bonus,
            total_earned = COALESCE(total_earned, 0) + v_approval_bonus
        WHERE user_id = v_spotter_id;
        
        -- Record approval bonus in ledger
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            reference_id,
            reference_type
        ) VALUES (
            v_spotter_id,
            v_approval_bonus,
            'approval_bonus',
            'approved',
            format('Approval bonus for trend: $0.50 × %s tier', v_user_tier),
            NEW.trend_id,
            'captured_trends'
        );
        
    -- Check if trend should be REJECTED (2+ NO votes)
    ELSIF v_no_votes >= 2 AND (SELECT earnings_status FROM captured_trends WHERE id = NEW.trend_id) = 'pending' THEN
        
        -- Mark trend as rejected
        UPDATE captured_trends
        SET 
            earnings_status = 'cancelled',
            status = 'rejected'
        WHERE id = NEW.trend_id;
        
        -- Remove pending earnings
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - v_trend_earnings)
        WHERE user_id = v_spotter_id;
        
        -- Cancel earnings in ledger
        UPDATE earnings_ledger
        SET 
            status = 'cancelled',
            description = description || ' [CANCELLED: Trend rejected]'
        WHERE reference_id = NEW.trend_id
        AND reference_type = 'captured_trends'
        AND status = 'pending';
        
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trend submission trigger (creates pending earnings)
CREATE TRIGGER calculate_trend_earnings_trigger
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trend_submission_earnings();

-- Validation trigger (pays $0.02 immediately)
CREATE TRIGGER calculate_validation_earnings_trigger
    BEFORE INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION calculate_validation_earnings();

-- Vote tracking trigger (handles approval/rejection)
CREATE TRIGGER handle_validation_vote_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_validation_vote();

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL,      -- Can't cash out yet
    approved_earnings DECIMAL,      -- Can cash out
    total_earned DECIMAL,          -- Lifetime total
    today_earned DECIMAL,
    current_tier TEXT,
    daily_streak INTEGER,
    session_streak INTEGER,
    tier_multiplier DECIMAL,
    next_session_multiplier DECIMAL,
    daily_multiplier DECIMAL,
    next_earning_estimate DECIMAL,
    can_cashout BOOLEAN
) AS $$
DECLARE
    v_tier TEXT;
    v_daily_streak INTEGER;
    v_session_streak INTEGER;
    v_next_session INTEGER;
    v_approved DECIMAL;
BEGIN
    -- Get user data
    SELECT 
        performance_tier, 
        current_streak,
        COALESCE(session_streak, 0),
        COALESCE(approved_earnings, 0)
    INTO v_tier, v_daily_streak, v_session_streak, v_approved
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Calculate next session position
    v_next_session := LEAST(v_session_streak + 1, 5);
    
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
        ) as next_earning_estimate,
        v_approved >= 5.00 as can_cashout -- Min $5 to cash out
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
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_captured_trends_status_earnings 
ON captured_trends(earnings_status, spotter_id);

CREATE INDEX IF NOT EXISTS idx_captured_trends_votes 
ON captured_trends(yes_votes, no_votes);

CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_status 
ON earnings_ledger(user_id, status);

-- =====================================================
-- VERIFICATION MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Complete earnings system installed!';
    RAISE NOTICE '💰 Trend: $0.25 base (PENDING until 2+ YES votes)';
    RAISE NOTICE '✓ Validation: $0.02 per vote (paid immediately)';
    RAISE NOTICE '🎯 Approval: $0.50 bonus when trend approved';
    RAISE NOTICE '❌ Rejection: Pending earnings cancelled on 2+ NO votes';
    RAISE NOTICE '📊 Cashout: Only APPROVED earnings can be withdrawn';
END $$;