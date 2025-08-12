-- =====================================================
-- SUSTAINABLE EARNINGS SYSTEM FOR WAVESIGHT
-- =====================================================
-- Balanced economics: Users earn fair wages, platform maintains 60%+ margins

-- Clear existing config and start fresh
TRUNCATE TABLE earnings_config;

-- Insert sustainable earnings values
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Base earnings (reduced to sustainable levels)
('base', 'trend_submission', 0.25, 'Base payment for submitting a trend'),
('base', 'validation_vote', 0.02, 'Payment per validation vote'),
('base', 'approval_bonus', 0.10, 'Bonus when trend gets approved'),

-- Quality bonuses (small but meaningful)
('quality', 'screenshot_included', 0.05, 'Bonus for including screenshot'),
('quality', 'complete_metadata', 0.05, 'Bonus for complete information'),
('quality', 'high_quality_score', 0.05, 'Bonus for quality score > 80'),

-- Performance bonuses (rare but motivating)
('performance', 'trending_content', 0.25, 'Bonus for content that trends'),
('performance', 'first_spotter', 0.50, 'First to spot a trending topic'),
('performance', 'high_value_category', 0.10, 'Finance/crypto category bonus'),

-- Tier multipliers (progressive but sustainable)
('multiplier', 'restricted', 0.50, 'Restricted tier - poor quality'),
('multiplier', 'learning', 1.00, 'Learning tier - new users'),
('multiplier', 'verified', 1.50, 'Verified tier - proven users'),
('multiplier', 'elite', 2.00, 'Elite tier - top 5%'),
('multiplier', 'master', 3.00, 'Master tier - top 1%'),

-- Daily caps by tier (prevents abuse)
('cap', 'daily_restricted', 5.00, 'Daily cap for restricted users'),
('cap', 'daily_learning', 10.00, 'Daily cap for learning users'),
('cap', 'daily_verified', 15.00, 'Daily cap for verified users'),
('cap', 'daily_elite', 20.00, 'Daily cap for elite users'),
('cap', 'daily_master', 30.00, 'Daily cap for master users'),

-- Per-trend caps by tier
('cap', 'trend_restricted', 0.50, 'Max per trend for restricted'),
('cap', 'trend_learning', 0.75, 'Max per trend for learning'),
('cap', 'trend_verified', 1.13, 'Max per trend for verified'),
('cap', 'trend_elite', 1.50, 'Max per trend for elite'),
('cap', 'trend_master', 2.25, 'Max per trend for master'),

-- Platform economics settings
('platform', 'target_payout_ratio', 0.40, 'Target 40% of revenue to users'),
('platform', 'min_trend_value', 2.00, 'Minimum value per trend to enterprise'),
('platform', 'target_margin', 0.60, 'Target 60% gross margin'),

-- Achievement bonuses (one-time)
('achievement', 'first_trend', 1.00, 'First trend submitted'),
('achievement', 'tenth_trend', 2.00, '10 trends submitted'),
('achievement', 'hundredth_trend', 10.00, '100 trends submitted'),
('achievement', 'first_viral', 5.00, 'First viral trend'),
('achievement', 'thousand_validations', 10.00, '1000 validations completed'),

-- Streak bonuses (sustainable)
('streak', 'week_streak', 1.00, '7 day submission streak'),
('streak', 'month_streak', 5.00, '30 day submission streak'),
('streak', 'quarter_streak', 10.00, '90 day submission streak'),

-- Referral program (capped)
('referral', 'new_user', 2.00, 'Referred user signs up'),
('referral', 'active_user', 5.00, 'Referred user reaches verified'),
('referral', 'monthly_cap', 50.00, 'Max referral earnings per month')
ON CONFLICT (config_type, config_key) DO UPDATE 
SET value = EXCLUDED.value, 
    description = EXCLUDED.description,
    updated_at = NOW();

-- Create function for sustainable earnings calculation
CREATE OR REPLACE FUNCTION calculate_sustainable_earnings(
    p_trend_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_base DECIMAL := 0.25;
    v_bonuses DECIMAL := 0;
    v_multiplier DECIMAL := 1.0;
    v_total DECIMAL;
    v_daily_earned DECIMAL;
    v_daily_cap DECIMAL;
    v_trend_cap DECIMAL;
    v_user RECORD;
    v_trend RECORD;
BEGIN
    -- Get user and trend data
    SELECT * INTO v_user FROM user_profiles WHERE user_id = p_user_id;
    SELECT * INTO v_trend FROM captured_trends WHERE id = p_trend_id;
    
    -- Base amount
    v_base := 0.25;
    
    -- Quality bonuses (max $0.15)
    IF v_trend.screenshot_url IS NOT NULL THEN
        v_bonuses := v_bonuses + 0.05;
    END IF;
    
    IF v_trend.quality_score > 80 THEN
        v_bonuses := v_bonuses + 0.05;
    END IF;
    
    IF v_trend.title IS NOT NULL 
       AND v_trend.description IS NOT NULL 
       AND LENGTH(v_trend.description) > 50 THEN
        v_bonuses := v_bonuses + 0.05;
    END IF;
    
    -- Performance bonuses (rare)
    -- Check if trending (simplified - would need real trending detection)
    IF (v_trend.metadata->>'view_count')::INTEGER > 100000 THEN
        v_bonuses := v_bonuses + 0.25; -- Trending bonus
    END IF;
    
    -- High-value category bonus
    IF v_trend.category IN ('finance', 'crypto', 'stocks') THEN
        v_bonuses := v_bonuses + 0.10;
    END IF;
    
    -- Get tier multiplier and caps
    CASE v_user.performance_tier
        WHEN 'master' THEN 
            v_multiplier := 3.00;
            v_daily_cap := 30.00;
            v_trend_cap := 2.25;
        WHEN 'elite' THEN 
            v_multiplier := 2.00;
            v_daily_cap := 20.00;
            v_trend_cap := 1.50;
        WHEN 'verified' THEN 
            v_multiplier := 1.50;
            v_daily_cap := 15.00;
            v_trend_cap := 1.13;
        WHEN 'learning' THEN 
            v_multiplier := 1.00;
            v_daily_cap := 10.00;
            v_trend_cap := 0.75;
        WHEN 'restricted' THEN 
            v_multiplier := 0.50;
            v_daily_cap := 5.00;
            v_trend_cap := 0.50;
        ELSE 
            v_multiplier := 1.00;
            v_daily_cap := 10.00;
            v_trend_cap := 0.75;
    END CASE;
    
    -- Calculate total with multiplier
    v_total := (v_base + v_bonuses) * v_multiplier;
    
    -- Apply per-trend cap
    IF v_total > v_trend_cap THEN
        v_total := v_trend_cap;
    END IF;
    
    -- Check daily earnings cap
    SELECT COALESCE(SUM(amount), 0) INTO v_daily_earned
    FROM earnings_ledger
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND transaction_type IN ('trend_submission', 'validation_vote');
    
    -- Apply daily cap if needed
    IF v_daily_earned + v_total > v_daily_cap THEN
        v_total := GREATEST(0, v_daily_cap - v_daily_earned);
    END IF;
    
    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- Create platform analytics function
CREATE OR REPLACE FUNCTION get_platform_economics()
RETURNS TABLE (
    total_users INTEGER,
    active_users_today INTEGER,
    trends_submitted_today INTEGER,
    validations_today INTEGER,
    payouts_today DECIMAL,
    payouts_month DECIMAL,
    avg_payout_per_user DECIMAL,
    avg_payout_per_trend DECIMAL,
    top_earner_today DECIMAL,
    projected_monthly_cost DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*)::INTEGER FROM user_profiles) as total_users,
        (SELECT COUNT(DISTINCT user_id)::INTEGER 
         FROM earnings_ledger 
         WHERE created_at >= CURRENT_DATE) as active_users_today,
        (SELECT COUNT(*)::INTEGER 
         FROM captured_trends 
         WHERE created_at >= CURRENT_DATE) as trends_submitted_today,
        (SELECT COUNT(*)::INTEGER 
         FROM trend_validations 
         WHERE created_at >= CURRENT_DATE) as validations_today,
        (SELECT COALESCE(SUM(amount), 0) 
         FROM earnings_ledger 
         WHERE created_at >= CURRENT_DATE 
         AND amount > 0) as payouts_today,
        (SELECT COALESCE(SUM(amount), 0) 
         FROM earnings_ledger 
         WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
         AND amount > 0) as payouts_month,
        (SELECT COALESCE(AVG(daily_total), 0) FROM (
            SELECT SUM(amount) as daily_total 
            FROM earnings_ledger 
            WHERE created_at >= CURRENT_DATE 
            AND amount > 0
            GROUP BY user_id
        ) user_daily) as avg_payout_per_user,
        (SELECT COALESCE(AVG(earnings), 0) 
         FROM captured_trends 
         WHERE created_at >= CURRENT_DATE) as avg_payout_per_trend,
        (SELECT COALESCE(MAX(daily_total), 0) FROM (
            SELECT SUM(amount) as daily_total 
            FROM earnings_ledger 
            WHERE created_at >= CURRENT_DATE 
            AND amount > 0
            GROUP BY user_id
        ) user_daily) as top_earner_today,
        (SELECT COALESCE(SUM(amount), 0) * 30 
         FROM earnings_ledger 
         WHERE created_at >= CURRENT_DATE 
         AND amount > 0) as projected_monthly_cost;
END;
$$ LANGUAGE plpgsql;

-- Create tier progression rules
CREATE OR REPLACE FUNCTION check_tier_progression(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_stats RECORD;
    v_new_tier TEXT;
    v_message TEXT;
BEGIN
    SELECT 
        trends_submitted,
        trends_approved,
        CASE WHEN trends_submitted > 0 
             THEN trends_approved::DECIMAL / trends_submitted 
             ELSE 0 END as approval_rate,
        quality_score,
        validations_completed
    INTO v_stats
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Tier progression rules (achievable but meaningful)
    IF v_stats.trends_submitted >= 100 
       AND v_stats.approval_rate >= 0.80 
       AND v_stats.quality_score >= 0.80 THEN
        v_new_tier := 'master';
        v_message := 'Congratulations! You reached MASTER tier (3x earnings)!';
    ELSIF v_stats.trends_submitted >= 50 
          AND v_stats.approval_rate >= 0.70 
          AND v_stats.quality_score >= 0.70 THEN
        v_new_tier := 'elite';
        v_message := 'Great job! You reached ELITE tier (2x earnings)!';
    ELSIF v_stats.trends_submitted >= 10 
          AND v_stats.approval_rate >= 0.60 
          AND v_stats.quality_score >= 0.60 THEN
        v_new_tier := 'verified';
        v_message := 'Well done! You reached VERIFIED tier (1.5x earnings)!';
    ELSIF v_stats.approval_rate < 0.30 AND v_stats.trends_submitted > 10 THEN
        v_new_tier := 'restricted';
        v_message := 'Your tier was reduced due to low quality submissions.';
    ELSE
        v_new_tier := 'learning';
        v_message := NULL;
    END IF;
    
    -- Update tier if changed
    UPDATE user_profiles 
    SET performance_tier = v_new_tier 
    WHERE user_id = p_user_id 
    AND performance_tier != v_new_tier;
    
    -- Log tier change
    IF FOUND AND v_message IS NOT NULL THEN
        INSERT INTO earnings_ledger (
            user_id, 
            transaction_type, 
            amount, 
            description,
            metadata
        ) VALUES (
            p_user_id,
            'adjustment',
            0,
            v_message,
            jsonb_build_object('tier_change', v_new_tier)
        );
    END IF;
    
    RETURN v_new_tier;
END;
$$ LANGUAGE plpgsql;

-- Create monthly payout summary
CREATE OR REPLACE FUNCTION get_monthly_payout_summary()
RETURNS TABLE (
    tier TEXT,
    user_count INTEGER,
    avg_earnings DECIMAL,
    total_payouts DECIMAL,
    percentage_of_total DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH tier_earnings AS (
        SELECT 
            up.performance_tier,
            COUNT(DISTINCT up.user_id) as users,
            AVG(el.month_total) as avg_earn,
            SUM(el.month_total) as total_earn
        FROM user_profiles up
        LEFT JOIN (
            SELECT 
                user_id,
                SUM(amount) as month_total
            FROM earnings_ledger
            WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
            AND amount > 0
            GROUP BY user_id
        ) el ON up.user_id = el.user_id
        WHERE el.month_total > 0
        GROUP BY up.performance_tier
    ),
    total_stats AS (
        SELECT SUM(total_earn) as grand_total
        FROM tier_earnings
    )
    SELECT 
        te.performance_tier,
        te.users::INTEGER,
        ROUND(te.avg_earn, 2),
        ROUND(te.total_earn, 2),
        ROUND((te.total_earn / ts.grand_total) * 100, 1)
    FROM tier_earnings te
    CROSS JOIN total_stats ts
    ORDER BY 
        CASE te.performance_tier
            WHEN 'master' THEN 1
            WHEN 'elite' THEN 2
            WHEN 'verified' THEN 3
            WHEN 'learning' THEN 4
            WHEN 'restricted' THEN 5
        END;
END;
$$ LANGUAGE plpgsql;

-- Sample calculations for different scenarios
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'SUSTAINABLE EARNINGS MODEL';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'BASE EARNINGS:';
    RAISE NOTICE '  Trend submission: $0.25';
    RAISE NOTICE '  Validation vote: $0.02';
    RAISE NOTICE '  Approval bonus: $0.10';
    RAISE NOTICE '';
    RAISE NOTICE 'REALISTIC MONTHLY EARNINGS:';
    RAISE NOTICE '  Learning (60%% of users): $50-150/month';
    RAISE NOTICE '  Verified (20%% of users): $150-300/month';
    RAISE NOTICE '  Elite (15%% of users): $300-500/month';
    RAISE NOTICE '  Master (5%% of users): $500-900/month';
    RAISE NOTICE '';
    RAISE NOTICE 'PLATFORM ECONOMICS (10K users):';
    RAISE NOTICE '  Monthly payouts: ~$80,000';
    RAISE NOTICE '  Required revenue: ~$200,000';
    RAISE NOTICE '  Gross margin: 60%%';
    RAISE NOTICE '  Break-even: 400 enterprise clients';
    RAISE NOTICE '';
    RAISE NOTICE 'UNIT ECONOMICS:';
    RAISE NOTICE '  Avg payout per trend: $0.40';
    RAISE NOTICE '  Value to enterprise: $2-5';
    RAISE NOTICE '  Margin per trend: 80-92%%';
END $$;