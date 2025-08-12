-- =====================================================
-- UNIFIED EARNINGS SYSTEM FOR WAVESIGHT
-- =====================================================
-- This creates a consistent, production-ready earnings system
-- with proper tracking, bonuses, and tier multipliers

-- Step 1: Create earnings configuration table
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

-- Insert standard earnings values
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Base earnings
('base', 'trend_submission', 1.00, 'Base payment for submitting a trend'),
('base', 'validation_vote', 0.10, 'Payment per validation vote'),
('base', 'approval_bonus', 0.50, 'Bonus when your trend gets approved'),

-- Quality bonuses
('quality', 'screenshot_included', 0.15, 'Bonus for including screenshot'),
('quality', 'complete_info', 0.10, 'Bonus for title and description'),
('quality', 'demographics_data', 0.10, 'Bonus for demographic info'),
('quality', 'multiple_platforms', 0.10, 'Bonus for multi-platform trend'),
('quality', 'creator_info', 0.05, 'Bonus for creator details'),
('quality', 'rich_hashtags', 0.05, 'Bonus for 3+ hashtags'),
('quality', 'caption_provided', 0.05, 'Bonus for caption'),

-- Performance bonuses
('performance', 'high_views', 0.25, 'Bonus for 100k+ views'),
('performance', 'viral_content', 0.50, 'Bonus for 1M+ views'),
('performance', 'high_engagement', 0.20, 'Bonus for >10% engagement'),
('performance', 'high_wave_score', 0.20, 'Bonus for wave score >70'),
('performance', 'finance_trend', 0.10, 'Bonus for finance/crypto trends'),

-- Tier multipliers
('multiplier', 'elite', 1.50, 'Elite tier multiplier'),
('multiplier', 'verified', 1.00, 'Verified tier multiplier'),
('multiplier', 'learning', 0.70, 'Learning tier multiplier'),
('multiplier', 'restricted', 0.30, 'Restricted tier multiplier'),

-- Caps
('cap', 'max_submission', 3.00, 'Maximum per submission'),
('cap', 'daily_max', 50.00, 'Maximum daily earnings')
ON CONFLICT (config_type, config_key) DO UPDATE 
SET value = EXCLUDED.value, 
    description = EXCLUDED.description,
    updated_at = NOW();

-- Step 2: Create comprehensive earnings ledger
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
    reference_id UUID, -- Links to trend_id or validation_id
    reference_type TEXT, -- 'trend', 'validation', 'cashout', etc
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_earnings_user_date (user_id, created_at DESC),
    INDEX idx_earnings_reference (reference_id, reference_type)
);

-- Step 3: Add proper columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning' CHECK (performance_tier IN ('restricted', 'learning', 'verified', 'elite')),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0;

-- Step 4: Function to calculate trend earnings with all bonuses
CREATE OR REPLACE FUNCTION calculate_trend_earnings(
    p_trend_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_base_amount DECIMAL;
    v_quality_bonus DECIMAL := 0;
    v_performance_bonus DECIMAL := 0;
    v_tier_multiplier DECIMAL;
    v_total_amount DECIMAL;
    v_trend RECORD;
    v_user_tier TEXT;
    v_max_cap DECIMAL;
BEGIN
    -- Get base amount
    SELECT value INTO v_base_amount 
    FROM earnings_config 
    WHERE config_type = 'base' AND config_key = 'trend_submission';
    
    -- Get trend details
    SELECT * INTO v_trend 
    FROM captured_trends 
    WHERE id = p_trend_id;
    
    -- Calculate quality bonuses
    IF v_trend.screenshot_url IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config WHERE config_type = 'quality' AND config_key = 'screenshot_included');
    END IF;
    
    IF v_trend.title IS NOT NULL AND v_trend.description IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config WHERE config_type = 'quality' AND config_key = 'complete_info');
    END IF;
    
    IF v_trend.demographics_data IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config WHERE config_type = 'quality' AND config_key = 'demographics_data');
    END IF;
    
    IF v_trend.creator_info IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + (SELECT value FROM earnings_config WHERE config_type = 'quality' AND config_key = 'creator_info');
    END IF;
    
    -- Calculate performance bonuses (based on metadata)
    IF (v_trend.metadata->>'view_count')::INTEGER > 1000000 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config WHERE config_type = 'performance' AND config_key = 'viral_content');
    ELSIF (v_trend.metadata->>'view_count')::INTEGER > 100000 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config WHERE config_type = 'performance' AND config_key = 'high_views');
    END IF;
    
    IF v_trend.wave_score > 70 THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config WHERE config_type = 'performance' AND config_key = 'high_wave_score');
    END IF;
    
    IF v_trend.category IN ('finance', 'crypto', 'stocks') THEN
        v_performance_bonus := v_performance_bonus + (SELECT value FROM earnings_config WHERE config_type = 'performance' AND config_key = 'finance_trend');
    END IF;
    
    -- Get user tier and multiplier
    SELECT performance_tier INTO v_user_tier 
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    SELECT value INTO v_tier_multiplier 
    FROM earnings_config 
    WHERE config_type = 'multiplier' AND config_key = v_user_tier;
    
    -- Calculate total with multiplier
    v_total_amount := (v_base_amount + v_quality_bonus + v_performance_bonus) * COALESCE(v_tier_multiplier, 1.0);
    
    -- Apply cap
    SELECT value INTO v_max_cap 
    FROM earnings_config 
    WHERE config_type = 'cap' AND config_key = 'max_submission';
    
    IF v_total_amount > v_max_cap THEN
        v_total_amount := v_max_cap;
    END IF;
    
    RETURN v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Function to record earnings transaction
CREATE OR REPLACE FUNCTION record_earnings_transaction(
    p_user_id UUID,
    p_transaction_type TEXT,
    p_amount DECIMAL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL,
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_balance_before DECIMAL;
    v_balance_after DECIMAL;
    v_transaction_id UUID;
BEGIN
    -- Get current balance
    SELECT current_balance INTO v_balance_before 
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    IF v_balance_before IS NULL THEN
        v_balance_before := 0;
    END IF;
    
    -- Calculate new balance
    v_balance_after := v_balance_before + p_amount;
    
    -- Insert transaction
    INSERT INTO earnings_ledger (
        user_id, transaction_type, amount, 
        balance_before, balance_after,
        reference_id, reference_type, 
        description, metadata
    ) VALUES (
        p_user_id, p_transaction_type, p_amount,
        v_balance_before, v_balance_after,
        p_reference_id, p_reference_type,
        p_description, p_metadata
    ) RETURNING id INTO v_transaction_id;
    
    -- Update user balance and stats
    UPDATE user_profiles 
    SET 
        current_balance = v_balance_after,
        total_earned = total_earned + CASE WHEN p_amount > 0 THEN p_amount ELSE 0 END,
        trends_submitted = CASE 
            WHEN p_transaction_type = 'trend_submission' 
            THEN trends_submitted + 1 
            ELSE trends_submitted 
        END,
        validations_completed = CASE 
            WHEN p_transaction_type = 'validation_vote' 
            THEN validations_completed + 1 
            ELSE validations_completed 
        END
    WHERE user_id = p_user_id;
    
    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Trigger to handle trend submission earnings
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
    v_description TEXT;
BEGIN
    -- Calculate earnings for this trend
    v_earnings := calculate_trend_earnings(NEW.id, NEW.user_id);
    
    -- Create description
    v_description := format('Trend submission: %s', COALESCE(NEW.title, 'Untitled'));
    
    -- Record the transaction
    PERFORM record_earnings_transaction(
        NEW.user_id,
        'trend_submission',
        v_earnings,
        NEW.id,
        'trend',
        v_description,
        jsonb_build_object(
            'trend_id', NEW.id,
            'category', NEW.category,
            'platform', NEW.platform,
            'wave_score', NEW.wave_score
        )
    );
    
    -- Update trend with earnings
    NEW.earnings := v_earnings;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new trends
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings ON captured_trends;
CREATE TRIGGER trigger_trend_submission_earnings
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- Step 7: Trigger to handle validation earnings
CREATE OR REPLACE FUNCTION handle_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_earnings DECIMAL;
    v_description TEXT;
    v_trend_title TEXT;
BEGIN
    -- Get validation earnings amount
    SELECT value INTO v_earnings 
    FROM earnings_config 
    WHERE config_type = 'base' AND config_key = 'validation_vote';
    
    -- Get trend title for description
    SELECT title INTO v_trend_title 
    FROM captured_trends 
    WHERE id = NEW.trend_id;
    
    v_description := format('Validation vote on: %s', COALESCE(v_trend_title, 'trend'));
    
    -- Record the transaction
    PERFORM record_earnings_transaction(
        NEW.user_id,
        'validation_vote',
        v_earnings,
        NEW.id,
        'validation',
        v_description,
        jsonb_build_object(
            'trend_id', NEW.trend_id,
            'vote', NEW.vote
        )
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validations
DROP TRIGGER IF EXISTS trigger_validation_earnings ON trend_validations;
CREATE TRIGGER trigger_validation_earnings
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_validation_earnings();

-- Step 8: Function to handle approval bonus
CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_bonus DECIMAL;
    v_description TEXT;
BEGIN
    -- Check if trend just got approved (status changed to 'approved')
    IF NEW.validation_status = 'approved' AND OLD.validation_status != 'approved' THEN
        -- Get approval bonus amount
        SELECT value INTO v_bonus 
        FROM earnings_config 
        WHERE config_type = 'base' AND config_key = 'approval_bonus';
        
        v_description := format('Approval bonus for trend: %s', COALESCE(NEW.title, 'Untitled'));
        
        -- Record the bonus transaction
        PERFORM record_earnings_transaction(
            NEW.user_id,
            'approval_bonus',
            v_bonus,
            NEW.id,
            'trend',
            v_description,
            jsonb_build_object('trend_id', NEW.id)
        );
        
        -- Update user stats
        UPDATE user_profiles 
        SET 
            trends_approved = trends_approved + 1,
            approval_rate = CASE 
                WHEN trends_submitted > 0 
                THEN (trends_approved + 1)::DECIMAL / trends_submitted 
                ELSE 0 
            END
        WHERE user_id = NEW.user_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for approval bonus
DROP TRIGGER IF EXISTS trigger_trend_approval_bonus ON captured_trends;
CREATE TRIGGER trigger_trend_approval_bonus
    AFTER UPDATE OF validation_status ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- Step 9: Function to update user tier based on performance
CREATE OR REPLACE FUNCTION update_user_tier(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_stats RECORD;
    v_new_tier TEXT;
BEGIN
    -- Get user stats
    SELECT 
        trends_submitted,
        trends_approved,
        approval_rate,
        quality_score,
        current_balance,
        total_earned
    INTO v_stats
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Determine tier based on performance
    IF v_stats.trends_submitted < 5 THEN
        v_new_tier := 'learning';
    ELSIF v_stats.approval_rate < 0.30 OR v_stats.quality_score < 0.30 THEN
        v_new_tier := 'restricted';
    ELSIF v_stats.trends_submitted >= 50 AND v_stats.approval_rate >= 0.85 AND v_stats.quality_score >= 0.85 THEN
        v_new_tier := 'elite';
    ELSIF v_stats.trends_submitted >= 10 AND v_stats.approval_rate >= 0.70 AND v_stats.quality_score >= 0.70 THEN
        v_new_tier := 'verified';
    ELSE
        v_new_tier := 'learning';
    END IF;
    
    -- Update tier if changed
    UPDATE user_profiles 
    SET performance_tier = v_new_tier 
    WHERE user_id = p_user_id AND performance_tier != v_new_tier;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Dashboard stats function
CREATE OR REPLACE FUNCTION get_user_earnings_stats(p_user_id UUID)
RETURNS TABLE (
    current_balance DECIMAL,
    total_earned DECIMAL,
    total_cashed_out DECIMAL,
    trends_submitted INTEGER,
    trends_approved INTEGER,
    validations_completed INTEGER,
    approval_rate DECIMAL,
    performance_tier TEXT,
    today_earnings DECIMAL,
    week_earnings DECIMAL,
    month_earnings DECIMAL,
    pending_cashout DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        up.current_balance,
        up.total_earned,
        up.total_cashed_out,
        up.trends_submitted,
        up.trends_approved,
        up.validations_completed,
        up.approval_rate,
        up.performance_tier,
        COALESCE((
            SELECT SUM(amount) 
            FROM earnings_ledger el 
            WHERE el.user_id = p_user_id 
            AND el.created_at >= CURRENT_DATE
            AND el.amount > 0
        ), 0) as today_earnings,
        COALESCE((
            SELECT SUM(amount) 
            FROM earnings_ledger el 
            WHERE el.user_id = p_user_id 
            AND el.created_at >= CURRENT_DATE - INTERVAL '7 days'
            AND el.amount > 0
        ), 0) as week_earnings,
        COALESCE((
            SELECT SUM(amount) 
            FROM earnings_ledger el 
            WHERE el.user_id = p_user_id 
            AND el.created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND el.amount > 0
        ), 0) as month_earnings,
        COALESCE((
            SELECT SUM(amount) 
            FROM cashout_requests cr 
            WHERE cr.user_id = p_user_id 
            AND cr.status = 'pending'
        ), 0) as pending_cashout
    FROM user_profiles up
    WHERE up.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Create cashout system
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_cashout_user (user_id, created_at DESC),
    INDEX idx_cashout_status (status, created_at)
);

-- Function to request cashout
CREATE OR REPLACE FUNCTION request_cashout(
    p_user_id UUID,
    p_amount DECIMAL,
    p_payment_method TEXT,
    p_payment_details JSONB
) RETURNS UUID AS $$
DECLARE
    v_current_balance DECIMAL;
    v_request_id UUID;
    v_min_cashout DECIMAL := 10.00; -- Minimum cashout amount
BEGIN
    -- Check balance
    SELECT current_balance INTO v_current_balance 
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance. Current balance: $%, Requested: $%', v_current_balance, p_amount;
    END IF;
    
    IF p_amount < v_min_cashout THEN
        RAISE EXCEPTION 'Minimum cashout amount is $%', v_min_cashout;
    END IF;
    
    -- Create cashout request
    INSERT INTO cashout_requests (
        user_id, amount, payment_method, payment_details
    ) VALUES (
        p_user_id, p_amount, p_payment_method, p_payment_details
    ) RETURNING id INTO v_request_id;
    
    -- Deduct from balance
    PERFORM record_earnings_transaction(
        p_user_id,
        'cashout',
        -p_amount,
        v_request_id,
        'cashout',
        format('Cashout request via %s', p_payment_method),
        p_payment_details
    );
    
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql;

-- Step 12: Add RLS policies
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own earnings
CREATE POLICY "Users can view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Everyone can read earnings config
CREATE POLICY "Public can view earnings config" ON earnings_config
    FOR SELECT USING (true);

-- Users can view their own cashout requests
CREATE POLICY "Users can view own cashouts" ON cashout_requests
    FOR SELECT USING (auth.uid() = user_id);

-- Users can create their own cashout requests
CREATE POLICY "Users can request cashouts" ON cashout_requests
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT ON earnings_config TO authenticated;
GRANT SELECT, INSERT ON earnings_ledger TO authenticated;
GRANT SELECT, INSERT ON cashout_requests TO authenticated;

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trends_user_date ON captured_trends(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trends_status ON captured_trends(validation_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validations_trend ON trend_validations(trend_id, created_at);
CREATE INDEX IF NOT EXISTS idx_validations_user ON trend_validations(user_id, created_at DESC);

-- Step 14: Initialize existing users with proper stats
UPDATE user_profiles up
SET 
    trends_submitted = COALESCE((SELECT COUNT(*) FROM captured_trends WHERE user_id = up.user_id), 0),
    trends_approved = COALESCE((SELECT COUNT(*) FROM captured_trends WHERE user_id = up.user_id AND validation_status = 'approved'), 0),
    validations_completed = COALESCE((SELECT COUNT(*) FROM trend_validations WHERE user_id = up.user_id), 0),
    approval_rate = CASE 
        WHEN (SELECT COUNT(*) FROM captured_trends WHERE user_id = up.user_id) > 0 
        THEN COALESCE((SELECT COUNT(*) FROM captured_trends WHERE user_id = up.user_id AND validation_status = 'approved')::DECIMAL / 
             (SELECT COUNT(*) FROM captured_trends WHERE user_id = up.user_id), 0)
        ELSE 0 
    END
WHERE up.total_earned IS NULL OR up.total_earned = 0;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Unified Earnings System installed successfully!';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '- Configurable earnings amounts';
    RAISE NOTICE '- Quality and performance bonuses';
    RAISE NOTICE '- Tier-based multipliers';
    RAISE NOTICE '- Complete earnings ledger';
    RAISE NOTICE '- Cashout request system';
    RAISE NOTICE '- Automatic earnings calculation';
    RAISE NOTICE '- User performance tracking';
END $$;