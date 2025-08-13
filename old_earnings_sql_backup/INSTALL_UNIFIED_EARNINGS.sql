-- =====================================================
-- INSTALL UNIFIED EARNINGS SYSTEM FROM SCRATCH
-- =====================================================
-- This creates the earnings system from zero, handling missing tables

-- Step 1: Create earnings_config table if it doesn't exist
CREATE TABLE IF NOT EXISTS earnings_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    config_type TEXT NOT NULL,
    config_key TEXT NOT NULL,
    value DECIMAL(10,2) NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(config_type, config_key)
);

-- Step 2: Create earnings_ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'trend_submission', 'validation_vote', 'approval_bonus',
        'quality_bonus', 'performance_bonus', 'tier_adjustment',
        'cashout', 'adjustment', 'referral'
    )),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
    reference_id UUID,
    reference_type TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_earnings_user_date ON earnings_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_earnings_reference ON earnings_ledger(reference_id, reference_type);

-- Step 4: Add missing columns to user_profiles if needed
DO $$
BEGIN
    -- Add earnings tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'current_balance') THEN
        ALTER TABLE user_profiles ADD COLUMN current_balance DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_earned') THEN
        ALTER TABLE user_profiles ADD COLUMN total_earned DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'total_cashed_out') THEN
        ALTER TABLE user_profiles ADD COLUMN total_cashed_out DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'performance_tier') THEN
        ALTER TABLE user_profiles ADD COLUMN performance_tier TEXT DEFAULT 'learning' 
        CHECK (performance_tier IN ('restricted', 'learning', 'verified', 'elite', 'master'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'quality_score') THEN
        ALTER TABLE user_profiles ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'approval_rate') THEN
        ALTER TABLE user_profiles ADD COLUMN approval_rate DECIMAL(3,2) DEFAULT 0.50;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'trends_submitted') THEN
        ALTER TABLE user_profiles ADD COLUMN trends_submitted INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'trends_approved') THEN
        ALTER TABLE user_profiles ADD COLUMN trends_approved INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'validations_completed') THEN
        ALTER TABLE user_profiles ADD COLUMN validations_completed INTEGER DEFAULT 0;
    END IF;
END $$;

-- Step 5: Add earnings column to captured_trends if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_trends' AND column_name = 'earnings') THEN
        ALTER TABLE captured_trends ADD COLUMN earnings DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'captured_trends' AND column_name = 'quality_score') THEN
        ALTER TABLE captured_trends ADD COLUMN quality_score INTEGER DEFAULT 50;
    END IF;
END $$;

-- Step 6: Clear any existing configuration
TRUNCATE TABLE earnings_config CASCADE;

-- Step 7: Drop ALL old earnings functions
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

-- Step 8: Insert sustainable earnings configuration
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Core earnings
('base', 'trend_submission', 0.25, 'Base payment per trend'),
('base', 'validation_vote', 0.02, 'Payment per validation'),
('base', 'approval_bonus', 0.10, 'Bonus when trend approved'),

-- Quality bonuses
('bonus', 'with_screenshot', 0.05, 'Has screenshot'),
('bonus', 'complete_data', 0.05, 'Has title and description'),
('bonus', 'high_quality', 0.05, 'Quality score > 80'),

-- Special bonuses
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

-- Step 9: Create the earnings calculation function
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
    
    IF v_trend.title IS NOT NULL AND LENGTH(v_trend.description) > 30 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    IF v_trend.quality_score > 80 THEN
        v_earnings := v_earnings + 0.05;
    END IF;
    
    -- Special bonuses
    IF (v_trend.metadata->>'view_count')::INTEGER > 100000 THEN
        v_earnings := v_earnings + 0.25;
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

-- Step 10: Create validation earnings function
CREATE OR REPLACE FUNCTION calculate_validation_earnings_final(
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_earnings DECIMAL := 0.02;
    v_daily_cap DECIMAL;
    v_today_earned DECIMAL;
    v_tier TEXT;
BEGIN
    -- Get user tier
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

-- Step 11: Create trigger for trend submission
CREATE OR REPLACE FUNCTION process_trend_submission_final()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
BEGIN
    -- Calculate earnings
    v_earnings := calculate_earnings_final(NEW.id, NEW.user_id);
    
    -- Set earnings on trend
    NEW.earnings := v_earnings;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop any existing trigger first
DROP TRIGGER IF EXISTS trigger_trend_earnings_final ON captured_trends;

CREATE TRIGGER trigger_trend_earnings_final
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION process_trend_submission_final();

-- Step 12: Create trigger to record earnings in ledger
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

DROP TRIGGER IF EXISTS trigger_record_trend_earnings_final ON captured_trends;

CREATE TRIGGER trigger_record_trend_earnings_final
    AFTER INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION record_trend_earnings_final();

-- Step 13: Create trigger for validation earnings
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

DROP TRIGGER IF EXISTS trigger_validation_earnings_final ON trend_validations;

CREATE TRIGGER trigger_validation_earnings_final
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION process_validation_earnings_final();

-- Step 14: Create cashout requests table
CREATE TABLE IF NOT EXISTS cashout_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('venmo', 'paypal', 'bank_transfer', 'crypto')),
    payment_details JSONB NOT NULL,
    processed_at TIMESTAMPTZ,
    processed_by UUID REFERENCES auth.users(id),
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cashout_user ON cashout_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashout_status ON cashout_requests(status, created_at);

-- Step 15: Create helper functions
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

-- Step 16: Enable RLS
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view own earnings" ON earnings_ledger;
CREATE POLICY "Users can view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view earnings config" ON earnings_config;
CREATE POLICY "Public can view earnings config" ON earnings_config
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own cashouts" ON cashout_requests;
CREATE POLICY "Users can view own cashouts" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can request cashouts" ON cashout_requests;
CREATE POLICY "Users can request cashouts" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 17: Grant permissions
GRANT SELECT ON earnings_config TO authenticated;
GRANT SELECT, INSERT ON earnings_ledger TO authenticated;
GRANT SELECT, INSERT ON cashout_requests TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_earnings_final TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_validation_earnings_final TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;

-- Final confirmation
DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'UNIFIED EARNINGS SYSTEM INSTALLED SUCCESSFULLY';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'System Configuration:';
    RAISE NOTICE '  Base trend payment: $0.25';
    RAISE NOTICE '  Validation payment: $0.02';
    RAISE NOTICE '  Approval bonus: $0.10';
    RAISE NOTICE '';
    RAISE NOTICE 'Daily Caps by Tier:';
    RAISE NOTICE '  Learning: $10/day';
    RAISE NOTICE '  Verified: $15/day (1.5x multiplier)';
    RAISE NOTICE '  Elite: $20/day (2x multiplier)';
    RAISE NOTICE '  Master: $30/day (3x multiplier)';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✓ earnings_config';
    RAISE NOTICE '  ✓ earnings_ledger';
    RAISE NOTICE '  ✓ cashout_requests';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  ✓ calculate_earnings_final()';
    RAISE NOTICE '  ✓ calculate_validation_earnings_final()';
    RAISE NOTICE '  ✓ get_user_earnings_summary()';
    RAISE NOTICE '';
    RAISE NOTICE 'Ready for production use!';
END $$;