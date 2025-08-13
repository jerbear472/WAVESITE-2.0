-- =====================================================
-- SUSTAINABLE EARNINGS MIGRATION
-- =====================================================
-- This migration implements the sustainable revenue model
-- with correct rates that ensure profitability
-- 
-- Revenue Model:
-- - $150k/mo revenue target
-- - 40% ($60k) to users maximum
-- - 10,000 active users = $6/user average
--
-- Run this migration to fix ALL earnings inconsistencies
-- =====================================================

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS earnings_config_backup_sustainable AS 
SELECT *, NOW() as backup_date FROM earnings_config;

CREATE TABLE IF NOT EXISTS earnings_ledger_backup_sustainable AS 
SELECT *, NOW() as backup_date FROM earnings_ledger;

-- Step 2: Clear old configuration
TRUNCATE TABLE earnings_config CASCADE;

-- Step 3: Drop ALL old/conflicting functions
DROP FUNCTION IF EXISTS calculate_trend_earnings CASCADE;
DROP FUNCTION IF EXISTS calculate_trend_earnings_v2 CASCADE;
DROP FUNCTION IF EXISTS calculate_sustainable_earnings CASCADE;
DROP FUNCTION IF EXISTS calculate_earnings_final CASCADE;
DROP FUNCTION IF EXISTS handle_trend_submission_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval CASCADE;
DROP FUNCTION IF EXISTS record_earnings_transaction CASCADE;
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings ON captured_trends;
DROP TRIGGER IF EXISTS trigger_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS trigger_trend_approval_bonus ON captured_trends;

-- Step 4: Insert SUSTAINABLE configuration (matches SUSTAINABLE_EARNINGS.ts exactly)
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Base rates (sustainable)
('base', 'trend_submission', 0.25, 'Base payment per trend'),
('base', 'validation_vote', 0.02, 'Payment per validation'),
('base', 'approval_bonus', 0.10, 'Bonus when trend approved'),

-- Quality bonuses
('quality', 'with_screenshot', 0.05, 'Has screenshot'),
('quality', 'complete_data', 0.05, 'Has title and description (30+ chars)'),
('quality', 'high_quality', 0.05, 'Quality score > 80'),
('quality', 'demographics', 0.03, 'Has demographic data'),
('quality', 'multi_platform', 0.03, 'Multiple platforms'),
('quality', 'creator_info', 0.02, 'Has creator details'),
('quality', 'rich_hashtags', 0.02, '3+ hashtags'),

-- Performance bonuses
('performance', 'trending', 0.25, '100k+ views'),
('performance', 'viral', 0.50, '1M+ views (replaces trending)'),
('performance', 'first_spotter', 0.50, 'First to spot viral trend'),
('performance', 'high_engagement', 0.10, '>10% engagement rate'),
('performance', 'finance_category', 0.10, 'Finance/crypto trends'),

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
('trend_cap', 'restricted', 0.50, 'Restricted per-trend limit'),

-- Validation settings
('validation', 'votes_to_approve', 3, 'Votes needed for approval'),
('validation', 'votes_to_reject', 3, 'Votes needed for rejection'),
('validation', 'max_voting_hours', 72, 'Max time for voting'),

-- Payment settings
('payment', 'min_cashout', 10.00, 'Minimum cashout amount');

-- Step 5: Update user_profiles schema
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning' 
  CHECK (performance_tier IN ('restricted', 'learning', 'verified', 'elite', 'master')),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.60,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.60,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS today_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS today_earned_date DATE DEFAULT CURRENT_DATE;

-- Add columns for proper earnings tracking
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_submissions INTEGER DEFAULT 0;

-- Step 6: Create earnings ledger if not exists
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    type TEXT NOT NULL CHECK (type IN (
        'submission', 'validation', 'approval',
        'quality_bonus', 'performance_bonus',
        'cashout', 'adjustment', 'achievement'
    )),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_verification', 'approved', 'rejected', 'paid')),
    reference_id UUID,
    reference_type TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_date ON earnings_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_reference ON earnings_ledger(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_earnings_status ON earnings_ledger(status, created_at DESC);

-- Step 7: Create THE ONLY earnings calculation function
CREATE OR REPLACE FUNCTION calculate_sustainable_earnings(
    p_trend_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0;
    v_tier TEXT;
    v_multiplier DECIMAL;
    v_trend_cap DECIMAL;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_trend RECORD;
    v_quality_bonus DECIMAL := 0;
    v_performance_bonus DECIMAL := 0;
BEGIN
    -- Get user tier
    SELECT COALESCE(performance_tier, 'learning') INTO v_tier
    FROM user_profiles WHERE user_id = p_user_id;
    
    -- Get tier configuration
    SELECT value INTO v_multiplier FROM earnings_config 
    WHERE config_type = 'tier' AND config_key = v_tier;
    
    SELECT value INTO v_trend_cap FROM earnings_config 
    WHERE config_type = 'trend_cap' AND config_key = v_tier;
    
    SELECT value INTO v_daily_cap FROM earnings_config 
    WHERE config_type = 'daily_cap' AND config_key = v_tier;
    
    -- Defaults
    v_multiplier := COALESCE(v_multiplier, 1.0);
    v_trend_cap := COALESCE(v_trend_cap, 0.75);
    v_daily_cap := COALESCE(v_daily_cap, 10.0);
    
    -- Check daily cap
    SELECT COALESCE(today_earned, 0) INTO v_today_earned
    FROM user_profiles WHERE user_id = p_user_id;
    
    IF v_today_earned >= v_daily_cap THEN
        RETURN 0; -- Daily cap reached
    END IF;
    
    -- Get trend data
    SELECT * INTO v_trend FROM captured_trends WHERE id = p_trend_id;
    
    -- Base earnings
    SELECT value INTO v_earnings FROM earnings_config 
    WHERE config_type = 'base' AND config_key = 'trend_submission';
    
    -- Quality bonuses
    IF v_trend.screenshot_url IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'with_screenshot');
    END IF;
    
    IF v_trend.title IS NOT NULL AND v_trend.description IS NOT NULL 
       AND LENGTH(v_trend.description) >= 30 THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'complete_data');
    END IF;
    
    IF v_trend.demographics_data IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'demographics');
    END IF;
    
    IF v_trend.platform IS NOT NULL AND jsonb_array_length(v_trend.platform) > 1 THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'multi_platform');
    END IF;
    
    IF v_trend.creator_info IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'creator_info');
    END IF;
    
    IF v_trend.hashtags IS NOT NULL AND jsonb_array_length(v_trend.hashtags) >= 3 THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'quality' AND config_key = 'rich_hashtags');
    END IF;
    
    -- Performance bonuses
    IF (v_trend.metadata->>'view_count')::INTEGER >= 1000000 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'performance' AND config_key = 'viral');
    ELSIF (v_trend.metadata->>'view_count')::INTEGER >= 100000 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'performance' AND config_key = 'trending');
    END IF;
    
    IF (v_trend.metadata->>'engagement_rate')::DECIMAL > 0.10 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'performance' AND config_key = 'high_engagement');
    END IF;
    
    IF v_trend.category IN ('finance', 'crypto', 'stocks') THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config 
            WHERE config_type = 'performance' AND config_key = 'finance_category');
    END IF;
    
    -- Calculate total with multiplier
    v_earnings := (v_earnings + v_quality_bonus + v_performance_bonus) * v_multiplier;
    
    -- Apply per-trend cap
    IF v_earnings > v_trend_cap THEN
        v_earnings := v_trend_cap;
    END IF;
    
    -- Apply remaining daily cap
    IF v_today_earned + v_earnings > v_daily_cap THEN
        v_earnings := v_daily_cap - v_today_earned;
    END IF;
    
    RETURN ROUND(v_earnings, 2);
END;
$$ LANGUAGE plpgsql;

-- Step 8: Function to record earnings
CREATE OR REPLACE FUNCTION record_earnings(
    p_user_id UUID,
    p_type TEXT,
    p_amount DECIMAL,
    p_status TEXT DEFAULT 'pending',
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_transaction_id UUID;
    v_today DATE := CURRENT_DATE;
BEGIN
    -- Insert into ledger
    INSERT INTO earnings_ledger (
        user_id, type, amount, status,
        reference_id, reference_type, description
    ) VALUES (
        p_user_id, p_type, p_amount, p_status,
        p_reference_id, p_reference_type, p_description
    ) RETURNING id INTO v_transaction_id;
    
    -- Update user profile
    UPDATE user_profiles 
    SET 
        -- Update balance based on status
        earnings_pending = CASE 
            WHEN p_status IN ('pending', 'awaiting_verification') 
            THEN earnings_pending + p_amount 
            ELSE earnings_pending 
        END,
        earnings_approved = CASE 
            WHEN p_status = 'approved' 
            THEN earnings_approved + p_amount 
            ELSE earnings_approved 
        END,
        -- Update totals
        total_earned = total_earned + CASE 
            WHEN p_amount > 0 THEN p_amount ELSE 0 
        END,
        -- Update daily earned
        today_earned = CASE 
            WHEN today_earned_date = v_today 
            THEN today_earned + p_amount
            ELSE p_amount
        END,
        today_earned_date = v_today,
        -- Update submission counts
        trends_submitted = CASE 
            WHEN p_type = 'submission' 
            THEN trends_submitted + 1 
            ELSE trends_submitted 
        END,
        validations_completed = CASE 
            WHEN p_type = 'validation' 
            THEN validations_completed + 1 
            ELSE validations_completed 
        END
    WHERE user_id = p_user_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Function to update user tier
CREATE OR REPLACE FUNCTION update_user_tier(p_user_id UUID) 
RETURNS TEXT AS $$
DECLARE
    v_stats RECORD;
    v_new_tier TEXT;
BEGIN
    -- Get user stats
    SELECT 
        trends_submitted,
        CASE WHEN trends_submitted > 0 
            THEN trends_approved::DECIMAL / trends_submitted 
            ELSE 0 
        END as approval_rate,
        COALESCE(quality_score, 0.60) as quality_score
    INTO v_stats
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- Determine tier based on requirements
    IF v_stats.approval_rate < 0.30 OR v_stats.quality_score < 0.30 THEN
        v_new_tier := 'restricted';
    ELSIF v_stats.trends_submitted >= 100 
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
    ELSE
        v_new_tier := 'learning';
    END IF;
    
    -- Update user tier
    UPDATE user_profiles 
    SET performance_tier = v_new_tier 
    WHERE user_id = p_user_id;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Trigger for trend submissions
CREATE OR REPLACE FUNCTION handle_trend_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
BEGIN
    -- Calculate earnings
    v_earnings := calculate_sustainable_earnings(NEW.id, NEW.user_id);
    
    -- Record earnings if > 0
    IF v_earnings > 0 THEN
        PERFORM record_earnings(
            NEW.user_id,
            'submission',
            v_earnings,
            'awaiting_verification',
            NEW.id,
            'trend',
            format('Trend: %s', COALESCE(NEW.title, 'Untitled'))
        );
    END IF;
    
    -- Update user stats
    UPDATE user_profiles 
    SET total_submissions = total_submissions + 1
    WHERE user_id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sustainable_trend_submission
AFTER INSERT ON captured_trends
FOR EACH ROW EXECUTE FUNCTION handle_trend_submission();

-- Step 11: Function for validation earnings
CREATE OR REPLACE FUNCTION handle_validation_vote()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
    v_tier TEXT;
    v_multiplier DECIMAL;
BEGIN
    -- Get user tier and multiplier
    SELECT performance_tier INTO v_tier
    FROM user_profiles WHERE user_id = NEW.user_id;
    
    SELECT value INTO v_multiplier FROM earnings_config 
    WHERE config_type = 'tier' AND config_key = COALESCE(v_tier, 'learning');
    
    -- Calculate validation earnings
    v_earnings := 0.02 * COALESCE(v_multiplier, 1.0);
    
    -- Record earnings
    PERFORM record_earnings(
        NEW.user_id,
        'validation',
        v_earnings,
        'approved',
        NEW.id,
        'validation',
        'Validation vote reward'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validation_earnings
AFTER INSERT ON trend_validations
FOR EACH ROW EXECUTE FUNCTION handle_validation_vote();

-- Step 12: Function for approval bonus
CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
    v_tier TEXT;
    v_multiplier DECIMAL;
BEGIN
    -- Check if status changed to approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Get user tier
        SELECT performance_tier INTO v_tier
        FROM user_profiles WHERE user_id = NEW.user_id;
        
        SELECT value INTO v_multiplier FROM earnings_config 
        WHERE config_type = 'tier' AND config_key = COALESCE(v_tier, 'learning');
        
        -- Calculate approval bonus
        v_earnings := 0.10 * COALESCE(v_multiplier, 1.0);
        
        -- Record approval bonus
        PERFORM record_earnings(
            NEW.user_id,
            'approval',
            v_earnings,
            'approved',
            NEW.id,
            'trend',
            format('Approval bonus for: %s', COALESCE(NEW.title, 'Untitled'))
        );
        
        -- Update verified submissions count
        UPDATE user_profiles 
        SET 
            verified_submissions = verified_submissions + 1,
            trends_approved = trends_approved + 1
        WHERE user_id = NEW.user_id;
        
        -- Convert pending earnings to approved
        UPDATE earnings_ledger 
        SET status = 'approved', approved_at = NOW()
        WHERE reference_id = NEW.id 
        AND status IN ('pending', 'awaiting_verification');
        
        -- Update user balances
        UPDATE user_profiles
        SET 
            earnings_pending = GREATEST(0, earnings_pending - (
                SELECT COALESCE(SUM(amount), 0) 
                FROM earnings_ledger 
                WHERE reference_id = NEW.id AND user_id = NEW.user_id
            )),
            earnings_approved = earnings_approved + (
                SELECT COALESCE(SUM(amount), 0) 
                FROM earnings_ledger 
                WHERE reference_id = NEW.id AND user_id = NEW.user_id
            )
        WHERE user_id = NEW.user_id;
        
        -- Update user tier
        PERFORM update_user_tier(NEW.user_id);
    END IF;
    
    -- Handle rejection
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        -- Mark earnings as rejected
        UPDATE earnings_ledger 
        SET status = 'rejected'
        WHERE reference_id = NEW.id 
        AND status IN ('pending', 'awaiting_verification');
        
        -- Remove from pending
        UPDATE user_profiles
        SET earnings_pending = GREATEST(0, earnings_pending - (
            SELECT COALESCE(SUM(amount), 0) 
            FROM earnings_ledger 
            WHERE reference_id = NEW.id AND user_id = NEW.user_id
        ))
        WHERE user_id = NEW.user_id;
        
        -- Update user tier
        PERFORM update_user_tier(NEW.user_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_trend_approval
AFTER UPDATE ON captured_trends
FOR EACH ROW EXECUTE FUNCTION handle_trend_approval();

-- Step 13: Reset daily earnings (run daily via cron)
CREATE OR REPLACE FUNCTION reset_daily_earnings()
RETURNS void AS $$
BEGIN
    UPDATE user_profiles
    SET today_earned = 0, today_earned_date = CURRENT_DATE
    WHERE today_earned_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Step 14: Migration - recalculate existing user tiers
UPDATE user_profiles p
SET 
    performance_tier = CASE
        WHEN approval_rate < 0.30 OR quality_score < 0.30 THEN 'restricted'
        WHEN trends_submitted >= 100 AND approval_rate >= 0.80 AND quality_score >= 0.80 THEN 'master'
        WHEN trends_submitted >= 50 AND approval_rate >= 0.70 AND quality_score >= 0.70 THEN 'elite'
        WHEN trends_submitted >= 10 AND approval_rate >= 0.60 AND quality_score >= 0.60 THEN 'verified'
        ELSE 'learning'
    END,
    approval_rate = CASE 
        WHEN total_submissions > 0 THEN verified_submissions::DECIMAL / total_submissions
        ELSE 0
    END;

-- Step 15: Create view for earnings dashboard
CREATE OR REPLACE VIEW user_earnings_summary AS
SELECT 
    u.id as user_id,
    u.email,
    p.performance_tier,
    p.earnings_pending,
    p.earnings_approved,
    p.earnings_paid,
    p.total_earned,
    p.current_balance,
    p.today_earned,
    p.trends_submitted,
    p.trends_approved,
    p.approval_rate,
    p.quality_score,
    t.daily_cap,
    t.trend_cap,
    t.multiplier
FROM auth.users u
JOIN user_profiles p ON p.user_id = u.id
LEFT JOIN LATERAL (
    SELECT 
        (SELECT value FROM earnings_config WHERE config_type = 'daily_cap' AND config_key = p.performance_tier) as daily_cap,
        (SELECT value FROM earnings_config WHERE config_type = 'trend_cap' AND config_key = p.performance_tier) as trend_cap,
        (SELECT value FROM earnings_config WHERE config_type = 'tier' AND config_key = p.performance_tier) as multiplier
) t ON true;

-- Step 16: Grant permissions
GRANT SELECT ON user_earnings_summary TO authenticated;
GRANT ALL ON earnings_ledger TO authenticated;
GRANT SELECT ON earnings_config TO authenticated;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Sustainable Earnings Migration Complete!';
    RAISE NOTICE 'Base rates: $0.25/trend, $0.02/validation, $0.10 approval bonus';
    RAISE NOTICE 'Tiers: Master (3x), Elite (2x), Verified (1.5x), Learning (1x), Restricted (0.5x)';
    RAISE NOTICE 'Daily caps: Master $30, Elite $20, Verified $15, Learning $10, Restricted $5';
    RAISE NOTICE 'All functions and triggers have been recreated';
END $$;