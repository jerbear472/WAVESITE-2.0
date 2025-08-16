-- =====================================================
-- FINAL UNIFIED EARNINGS SYSTEM - SINGLE SOURCE OF TRUTH
-- =====================================================
-- This replaces ALL other earnings logic in the system
-- Run this AFTER backing up your database

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS earnings_config_backup AS SELECT * FROM earnings_config;
CREATE TABLE IF NOT EXISTS earnings_ledger_backup AS SELECT * FROM earnings_ledger;

-- Step 2: Clear ALL old earnings configuration
TRUNCATE TABLE earnings_config CASCADE;

-- Step 3: Drop ALL old earnings functions to prevent conflicts
DROP FUNCTION IF EXISTS calculate_trend_earnings CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_earnings_v2 CASCADE;
DROP FUNCTION IF EXISTS calculate_sustainable_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_trend_submission_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval CASCADE;
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings ON captured_trends;
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings_v2 ON captured_trends;
DROP TRIGGER IF EXISTS trigger_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS trigger_trend_approval_bonus ON captured_trends;

-- Step 4: Insert FINAL sustainable earnings configuration
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Core earnings (sustainable levels)
('base', 'trend_submission', 0.25, 'Base payment per trend'),
('base', 'validation_vote', 0.02, 'Payment per validation'),
('base', 'approval_bonus', 0.10, 'Bonus when trend approved'),

-- Quality bonuses (small, achievable)
('bonus', 'with_screenshot', 0.05, 'Has screenshot'),
('bonus', 'complete_data', 0.05, 'Has title and description'),
('bonus', 'high_quality', 0.05, 'Quality score > 80'),

-- Special bonuses (rare)
('bonus', 'trending', 0.25, 'Goes viral (100k+ views)'),
('bonus', 'first_spotter', 0.50, 'First to spot viral trend'),
('bonus', 'finance_category', 0.10, 'Finance/crypto content'),

-- Tier multipliers
('tier', 'master', 3.00, 'Top 1% multiplier'),
('tier', 'elite', 2.00, 'Top 5% multiplier'),
('tier', 'verified', 1.50, 'Proven user multiplier'),
('tier', 'learning', 1.00, 'New user multiplier'),
('tier', 'restricted', 0.50, 'Low quality multiplier'),

-- Daily caps by tier
('daily_cap', 'master', 30.00, 'Master daily limit'),
('daily_cap', 'elite', 20.00, 'Elite daily limit'),
('daily_cap', 'verified', 15.00, 'Verified daily limit'),
('daily_cap', 'learning', 10.00, 'Learning daily limit'),
('daily_cap', 'restricted', 5.00, 'Restricted daily limit'),

-- Per-trend caps
('trend_cap', 'master', 2.25, 'Master per-trend limit'),
('trend_cap', 'elite', 1.50, 'Elite per-trend limit'),
('trend_cap', 'verified', 1.13, 'Verified per-trend limit'),
('trend_cap', 'learning', 0.75, 'Learning per-trend limit'),
('trend_cap', 'restricted', 0.50, 'Restricted per-trend limit');

-- Step 5: Create THE ONLY earnings calculation function
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
    -- Get user tier
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles WHERE user_id = p_user_id;
    
    -- Get tier config
    SELECT value INTO v_multiplier FROM earnings_config 
    WHERE config_type = 'tier' AND config_key = v_tier;
    
    SELECT value INTO v_daily_cap FROM earnings_config 
    WHERE config_type = 'daily_cap' AND config_key = v_tier;
    
    SELECT value INTO v_trend_cap FROM earnings_config 
    WHERE config_type = 'trend_cap' AND config_key = v_tier;
    
    -- Default if not found
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
    
    IF v_trend.title IS NOT NULL AND LENGTH(v_trend.description) > 30 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    IF v_trend.quality_score > 80 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    -- Special bonuses
    IF (v_trend.metadata->>'view_count')::INTEGER > 100000 THEN
        v_earnings := v_earnings + 0.25; -- Trending bonus
    END IF;
    
    IF v_trend.category IN ('finance', 'crypto', 'stocks') THEN
        v_earnings := v_earnings + 0.10;
    END IF;
    
    -- Apply tier multiplier
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
    
    -- Apply daily cap
    IF v_today_earned + v_earnings > v_daily_cap THEN
        v_earnings := GREATEST(0, v_daily_cap - v_today_earned);
    END IF;
    
    RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create simplified validation earnings function
CREATE OR REPLACE FUNCTION calculate_validation_earnings_final(
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0.02;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_tier TEXT;
BEGIN
    -- Get user tier for daily cap
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles WHERE user_id = p_user_id;
    
    SELECT value INTO v_daily_cap FROM earnings_config 
    WHERE config_type = 'daily_cap' AND config_key = v_tier;
    
    v_daily_cap := COALESCE(v_daily_cap, 10.0);
    
    -- Check daily earnings
    SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
    FROM earnings_ledger
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND amount > 0;
    
    -- Apply daily cap
    IF v_today_earned + v_earnings > v_daily_cap THEN
        v_earnings := GREATEST(0, v_daily_cap - v_today_earned);
    END IF;
    
    RETURN v_earnings;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for trend submission
CREATE OR REPLACE FUNCTION process_trend_submission_final()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
BEGIN
    -- Calculate earnings
    v_earnings := calculate_earnings_final(NEW.id, NEW.user_id);
    
    -- Set earnings on trend
    NEW.earnings := v_earnings;
    
    -- Record in ledger will happen after insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trend_earnings_final
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION process_trend_submission_final();

-- Step 8: Create trigger to record earnings in ledger
CREATE OR REPLACE FUNCTION record_trend_earnings_final()
RETURNS TRIGGER AS $$
BEGIN
    -- Record earnings transaction
    INSERT INTO earnings_ledger (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        reference_type,
        description
    ) VALUES (
        NEW.user_id,
        'trend_submission',
        NEW.earnings,
        COALESCE((SELECT current_balance FROM user_profiles WHERE user_id = NEW.user_id), 0),
        COALESCE((SELECT current_balance FROM user_profiles WHERE user_id = NEW.user_id), 0) + NEW.earnings,
        NEW.id,
        'trend',
        'Trend: ' || COALESCE(NEW.title, 'Untitled')
    );
    
    -- Update user balance
    UPDATE user_profiles 
    SET 
        current_balance = COALESCE(current_balance, 0) + NEW.earnings,
        total_earned = COALESCE(total_earned, 0) + NEW.earnings,
        trends_submitted = COALESCE(trends_submitted, 0) + 1
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_record_trend_earnings_final
    AFTER INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION record_trend_earnings_final();

-- Step 9: Create trigger for validation earnings
CREATE OR REPLACE FUNCTION process_validation_earnings_final()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
BEGIN
    -- Calculate earnings
    v_earnings := calculate_validation_earnings_final(NEW.user_id);
    
    -- Record transaction
    INSERT INTO earnings_ledger (
        user_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_id,
        reference_type,
        description
    ) VALUES (
        NEW.user_id,
        'validation_vote',
        v_earnings,
        COALESCE((SELECT current_balance FROM user_profiles WHERE user_id = NEW.user_id), 0),
        COALESCE((SELECT current_balance FROM user_profiles WHERE user_id = NEW.user_id), 0) + v_earnings,
        NEW.id,
        'validation',
        'Validation vote'
    );
    
    -- Update user balance
    UPDATE user_profiles 
    SET 
        current_balance = COALESCE(current_balance, 0) + v_earnings,
        total_earned = COALESCE(total_earned, 0) + v_earnings,
        validations_completed = COALESCE(validations_completed, 0) + 1
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validation_earnings_final
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION process_validation_earnings_final();

-- Step 10: Create trigger for approval bonus
CREATE OR REPLACE FUNCTION process_approval_bonus_final()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus DECIMAL := 0.10;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_tier TEXT;
BEGIN
    -- Only process if status changed to approved
    IF NEW.validation_status = 'approved' AND OLD.validation_status != 'approved' THEN
        
        -- Get user tier for cap
        SELECT COALESCE(performance_tier, 'learning') INTO v_tier
        FROM user_profiles WHERE user_id = NEW.user_id;
        
        SELECT value INTO v_daily_cap FROM earnings_config 
        WHERE config_type = 'daily_cap' AND config_key = v_tier;
        
        -- Check daily cap
        SELECT COALESCE(SUM(amount), 0) INTO v_today_earned
        FROM earnings_ledger
        WHERE user_id = NEW.user_id
        AND created_at >= CURRENT_DATE
        AND amount > 0;
        
        IF v_today_earned + v_bonus <= v_daily_cap THEN
            -- Record bonus
            INSERT INTO earnings_ledger (
                user_id,
                transaction_type,
                amount,
                reference_id,
                reference_type,
                description
            ) VALUES (
                NEW.user_id,
                'approval_bonus',
                v_bonus,
                NEW.id,
                'trend',
                'Approval bonus for: ' || COALESCE(NEW.title, 'trend')
            );
            
            -- Update user stats
            UPDATE user_profiles 
            SET 
                current_balance = COALESCE(current_balance, 0) + v_bonus,
                total_earned = COALESCE(total_earned, 0) + v_bonus,
                trends_approved = COALESCE(trends_approved, 0) + 1
            WHERE user_id = NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_approval_bonus_final
    AFTER UPDATE OF validation_status ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION process_approval_bonus_final();

-- Step 11: Create tier update function
CREATE OR REPLACE FUNCTION update_user_tier_final(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_stats RECORD;
    v_new_tier TEXT;
    v_old_tier TEXT;
BEGIN
    -- Get current stats
    SELECT 
        performance_tier,
        COALESCE(trends_submitted, 0) as trends_submitted,
        COALESCE(trends_approved, 0) as trends_approved,
        CASE 
            WHEN COALESCE(trends_submitted, 0) > 0 
            THEN COALESCE(trends_approved, 0)::DECIMAL / trends_submitted
            ELSE 0 
        END as approval_rate,
        COALESCE(quality_score, 0.5) as quality_score
    INTO v_stats
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    v_old_tier := v_stats.performance_tier;
    
    -- Determine new tier based on realistic criteria
    IF v_stats.trends_submitted >= 100 
       AND v_stats.approval_rate >= 0.80 
       AND v_stats.quality_score >= 0.80 THEN
        v_new_tier := 'master';
    ELSIF v_stats.trends_submitted >= 50 
          AND v_stats.approval_rate >= 0.70 
          AND v_stats.quality_score >= 0.70 THEN
        v_new_tier := 'elite';
    ELSIF v_stats.trends_submitted >= 10 
          AND v_stats.approval_rate >= 0.60 
          AND v_stats.quality_score >= 0.60 THEN
        v_new_tier := 'verified';
    ELSIF v_stats.approval_rate < 0.30 
          AND v_stats.trends_submitted >= 10 THEN
        v_new_tier := 'restricted';
    ELSE
        v_new_tier := 'learning';
    END IF;
    
    -- Update if changed
    IF v_old_tier IS DISTINCT FROM v_new_tier THEN
        UPDATE user_profiles 
        SET performance_tier = v_new_tier
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Create cleanup function to remove duplicate triggers
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop any duplicate triggers
    FOR r IN 
        SELECT DISTINCT tgname 
        FROM pg_trigger 
        WHERE tgname LIKE '%earning%' 
        AND tgname NOT LIKE '%_final'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON captured_trends', r.tgname);
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_validations', r.tgname);
    END LOOP;
END $$;

-- Step 13: Add helper function for getting user earnings stats
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

-- Final: Grant permissions
GRANT SELECT ON earnings_config TO authenticated;
GRANT SELECT, INSERT ON earnings_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_earnings_final TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_validation_earnings_final TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_tier_final TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- Confirmation
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'FINAL UNIFIED EARNINGS SYSTEM INSTALLED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Earnings Rates:';
    RAISE NOTICE '  Trend: $0.25 base (up to $0.75-2.25 with bonuses/tier)';
    RAISE NOTICE '  Validation: $0.02 per vote';
    RAISE NOTICE '  Approval: $0.10 bonus';
    RAISE NOTICE '';
    RAISE NOTICE 'Daily Caps:';
    RAISE NOTICE '  Learning: $10/day';
    RAISE NOTICE '  Verified: $15/day';
    RAISE NOTICE '  Elite: $20/day';
    RAISE NOTICE '  Master: $30/day';
    RAISE NOTICE '';
    RAISE NOTICE 'ALL old earnings functions have been removed.';
    RAISE NOTICE 'This is now the ONLY earnings system.';
END $$;