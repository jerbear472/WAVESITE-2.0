-- =====================================================
-- REVISED EARNINGS SYSTEM WITH BETTER MULTIPLIERS
-- =====================================================
-- This creates a more aggressive tier system that rewards top performers

-- Clear existing config
DELETE FROM earnings_config WHERE config_type = 'multiplier';

-- Insert new tier multipliers that make sense for gig economy
INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Base earnings (unchanged)
('base', 'trend_submission', 1.00, 'Base payment for submitting a trend'),
('base', 'validation_vote', 0.10, 'Payment per validation vote'),
('base', 'approval_bonus', 0.50, 'Bonus when your trend gets approved'),

-- REVISED TIER MULTIPLIERS - Much more aggressive
('multiplier', 'restricted', 0.25, 'Restricted tier - low quality submissions'),
('multiplier', 'learning', 1.00, 'Learning tier - new users default'),
('multiplier', 'verified', 2.00, 'Verified tier - proven contributors'),
('multiplier', 'elite', 3.00, 'Elite tier - top 10% of users'),
('multiplier', 'master', 5.00, 'Master tier - top 1% of users'),

-- Performance bonuses (increased for viral content)
('performance', 'high_views', 0.50, 'Bonus for 100k+ views'),
('performance', 'viral_content', 2.00, 'Bonus for 1M+ views'),
('performance', 'mega_viral', 5.00, 'Bonus for 10M+ views'),
('performance', 'high_engagement', 0.50, 'Bonus for >10% engagement'),
('performance', 'trending_now', 1.00, 'Bonus for catching trend in first 24h'),

-- Category multipliers (some categories worth more)
('category_multiplier', 'finance', 2.00, 'Finance/crypto trends worth 2x'),
('category_multiplier', 'stocks', 2.00, 'Stock market trends worth 2x'),
('category_multiplier', 'crypto', 2.50, 'Crypto trends worth 2.5x'),
('category_multiplier', 'nft', 2.00, 'NFT trends worth 2x'),
('category_multiplier', 'ai', 1.50, 'AI trends worth 1.5x'),
('category_multiplier', 'politics', 1.50, 'Political trends worth 1.5x'),
('category_multiplier', 'breaking_news', 3.00, 'Breaking news worth 3x'),

-- Speed bonuses (reward being first)
('speed', 'first_spotter', 5.00, 'First to spot a trend that goes viral'),
('speed', 'early_spotter', 2.00, 'In first 10 to spot viral trend'),
('speed', 'quick_submit', 0.50, 'Submitted within 1 hour of posting'),

-- Streak bonuses
('streak', 'daily_3', 0.50, '3 day streak bonus'),
('streak', 'daily_7', 1.00, '7 day streak bonus'),
('streak', 'daily_30', 5.00, '30 day streak bonus'),

-- Referral bonuses
('referral', 'new_user', 5.00, 'Bonus for referring active user'),
('referral', 'power_user', 25.00, 'Bonus for referring user who becomes elite'),

-- Updated caps (higher for power users)
('cap', 'max_submission_learning', 5.00, 'Max per submission for learning tier'),
('cap', 'max_submission_verified', 10.00, 'Max per submission for verified tier'),
('cap', 'max_submission_elite', 25.00, 'Max per submission for elite tier'),
('cap', 'max_submission_master', 50.00, 'Max per submission for master tier'),
('cap', 'daily_max_learning', 50.00, 'Daily max for learning tier'),
('cap', 'daily_max_verified', 200.00, 'Daily max for verified tier'),
('cap', 'daily_max_elite', 500.00, 'Daily max for elite tier'),
('cap', 'daily_max_master', 1000.00, 'Daily max for master tier')
ON CONFLICT (config_type, config_key) DO UPDATE 
SET value = EXCLUDED.value, 
    description = EXCLUDED.description,
    updated_at = NOW();

-- Update tier requirements to be more achievable
DELETE FROM earnings_config WHERE config_type = 'tier_requirement';

INSERT INTO earnings_config (config_type, config_key, value, description) VALUES
-- Learning → Verified (easy to achieve)
('tier_requirement', 'verified_min_trends', 5.00, 'Minimum trends for verified'),
('tier_requirement', 'verified_min_approval', 0.60, 'Minimum 60% approval rate'),
('tier_requirement', 'verified_min_quality', 0.50, 'Minimum 50% quality score'),

-- Verified → Elite (moderate difficulty)
('tier_requirement', 'elite_min_trends', 25.00, 'Minimum trends for elite'),
('tier_requirement', 'elite_min_approval', 0.75, 'Minimum 75% approval rate'),
('tier_requirement', 'elite_min_quality', 0.70, 'Minimum 70% quality score'),
('tier_requirement', 'elite_min_viral', 3.00, 'Minimum 3 viral trends'),

-- Elite → Master (hard to achieve)
('tier_requirement', 'master_min_trends', 100.00, 'Minimum trends for master'),
('tier_requirement', 'master_min_approval', 0.85, 'Minimum 85% approval rate'),
('tier_requirement', 'master_min_quality', 0.85, 'Minimum 85% quality score'),
('tier_requirement', 'master_min_viral', 10.00, 'Minimum 10 viral trends'),
('tier_requirement', 'master_min_earnings', 1000.00, 'Minimum $1000 total earned');

-- Add new columns to track user achievements
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS viral_trends_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS mega_viral_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_spotter_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_date DATE,
ADD COLUMN IF NOT EXISTS referrals_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS category_specialties JSONB DEFAULT '{}';

-- Update the earnings calculation function
CREATE OR REPLACE FUNCTION calculate_trend_earnings_v2(
    p_trend_id UUID,
    p_user_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_base_amount DECIMAL := 1.00;
    v_quality_bonus DECIMAL := 0;
    v_performance_bonus DECIMAL := 0;
    v_speed_bonus DECIMAL := 0;
    v_tier_multiplier DECIMAL;
    v_category_multiplier DECIMAL := 1.0;
    v_total_amount DECIMAL;
    v_trend RECORD;
    v_user RECORD;
    v_max_cap DECIMAL;
    v_is_first_spotter BOOLEAN := false;
    v_hours_since_post DECIMAL;
BEGIN
    -- Get trend and user details
    SELECT * INTO v_trend FROM captured_trends WHERE id = p_trend_id;
    SELECT * INTO v_user FROM user_profiles WHERE user_id = p_user_id;
    
    -- BASE AMOUNT remains $1
    v_base_amount := 1.00;
    
    -- QUALITY BONUSES (up to $1.00)
    IF v_trend.screenshot_url IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + 0.20;
    END IF;
    
    IF v_trend.title IS NOT NULL AND v_trend.description IS NOT NULL 
       AND LENGTH(v_trend.description) > 50 THEN
        v_quality_bonus := v_quality_bonus + 0.30;
    END IF;
    
    IF v_trend.demographics_data IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + 0.20;
    END IF;
    
    IF v_trend.metadata->>'hashtags' IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + 0.15;
    END IF;
    
    IF v_trend.creator_info IS NOT NULL THEN
        v_quality_bonus := v_quality_bonus + 0.15;
    END IF;
    
    -- PERFORMANCE BONUSES (significantly increased)
    IF (v_trend.metadata->>'view_count')::INTEGER > 10000000 THEN
        v_performance_bonus := v_performance_bonus + 5.00; -- Mega viral
    ELSIF (v_trend.metadata->>'view_count')::INTEGER > 1000000 THEN
        v_performance_bonus := v_performance_bonus + 2.00; -- Viral
    ELSIF (v_trend.metadata->>'view_count')::INTEGER > 100000 THEN
        v_performance_bonus := v_performance_bonus + 0.50; -- High views
    END IF;
    
    -- Engagement bonus
    IF (v_trend.metadata->>'engagement_rate')::DECIMAL > 0.10 THEN
        v_performance_bonus := v_performance_bonus + 0.50;
    END IF;
    
    -- SPEED BONUSES (reward being early)
    -- Check if first to spot this URL
    SELECT COUNT(*) = 0 INTO v_is_first_spotter
    FROM captured_trends
    WHERE url = v_trend.url
    AND created_at < v_trend.created_at;
    
    IF v_is_first_spotter THEN
        -- Check if it becomes viral later
        IF (v_trend.metadata->>'view_count')::INTEGER > 1000000 THEN
            v_speed_bonus := 5.00; -- First spotter of viral trend!
        ELSE
            v_speed_bonus := 1.00; -- First spotter bonus
        END IF;
    END IF;
    
    -- Quick submit bonus (if metadata has original post time)
    IF v_trend.metadata->>'posted_at' IS NOT NULL THEN
        v_hours_since_post := EXTRACT(EPOCH FROM (v_trend.created_at - (v_trend.metadata->>'posted_at')::TIMESTAMPTZ)) / 3600;
        IF v_hours_since_post < 1 THEN
            v_speed_bonus := v_speed_bonus + 0.50;
        END IF;
    END IF;
    
    -- CATEGORY MULTIPLIER (some categories worth more)
    CASE v_trend.category
        WHEN 'finance' THEN v_category_multiplier := 2.00;
        WHEN 'crypto' THEN v_category_multiplier := 2.50;
        WHEN 'stocks' THEN v_category_multiplier := 2.00;
        WHEN 'breaking_news' THEN v_category_multiplier := 3.00;
        WHEN 'ai' THEN v_category_multiplier := 1.50;
        WHEN 'politics' THEN v_category_multiplier := 1.50;
        ELSE v_category_multiplier := 1.00;
    END CASE;
    
    -- TIER MULTIPLIER (much more aggressive)
    CASE v_user.performance_tier
        WHEN 'master' THEN 
            v_tier_multiplier := 5.00;
            v_max_cap := 50.00;
        WHEN 'elite' THEN 
            v_tier_multiplier := 3.00;
            v_max_cap := 25.00;
        WHEN 'verified' THEN 
            v_tier_multiplier := 2.00;
            v_max_cap := 10.00;
        WHEN 'learning' THEN 
            v_tier_multiplier := 1.00;
            v_max_cap := 5.00;
        WHEN 'restricted' THEN 
            v_tier_multiplier := 0.25;
            v_max_cap := 2.00;
        ELSE 
            v_tier_multiplier := 1.00;
            v_max_cap := 5.00;
    END CASE;
    
    -- CALCULATE TOTAL
    -- Base + bonuses, then apply multipliers
    v_total_amount := (v_base_amount + v_quality_bonus + v_performance_bonus + v_speed_bonus);
    v_total_amount := v_total_amount * v_tier_multiplier * v_category_multiplier;
    
    -- Apply cap based on tier
    IF v_total_amount > v_max_cap THEN
        v_total_amount := v_max_cap;
    END IF;
    
    -- Update user stats if first spotter
    IF v_is_first_spotter THEN
        UPDATE user_profiles 
        SET first_spotter_count = first_spotter_count + 1
        WHERE user_id = p_user_id;
    END IF;
    
    -- Update viral counts
    IF (v_trend.metadata->>'view_count')::INTEGER > 10000000 THEN
        UPDATE user_profiles 
        SET mega_viral_count = mega_viral_count + 1
        WHERE user_id = p_user_id;
    ELSIF (v_trend.metadata->>'view_count')::INTEGER > 1000000 THEN
        UPDATE user_profiles 
        SET viral_trends_count = viral_trends_count + 1
        WHERE user_id = p_user_id;
    END IF;
    
    RETURN v_total_amount;
END;
$$ LANGUAGE plpgsql;

-- Update tier calculation to include master tier
CREATE OR REPLACE FUNCTION update_user_tier_v2(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_stats RECORD;
    v_new_tier TEXT;
BEGIN
    -- Get comprehensive user stats
    SELECT 
        trends_submitted,
        trends_approved,
        approval_rate,
        quality_score,
        total_earned,
        viral_trends_count,
        mega_viral_count,
        first_spotter_count
    INTO v_stats
    FROM user_profiles
    WHERE user_id = p_user_id;
    
    -- Determine tier with new requirements
    IF v_stats.trends_submitted >= 100 
       AND v_stats.approval_rate >= 0.85 
       AND v_stats.quality_score >= 0.85
       AND v_stats.viral_trends_count >= 10
       AND v_stats.total_earned >= 1000 THEN
        v_new_tier := 'master';
    ELSIF v_stats.trends_submitted >= 25 
          AND v_stats.approval_rate >= 0.75 
          AND v_stats.quality_score >= 0.70
          AND v_stats.viral_trends_count >= 3 THEN
        v_new_tier := 'elite';
    ELSIF v_stats.trends_submitted >= 5 
          AND v_stats.approval_rate >= 0.60 
          AND v_stats.quality_score >= 0.50 THEN
        v_new_tier := 'verified';
    ELSIF v_stats.approval_rate < 0.30 OR v_stats.quality_score < 0.30 THEN
        v_new_tier := 'restricted';
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

-- Add streak tracking function
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_last_submission DATE;
    v_current_streak INTEGER;
    v_streak_bonus DECIMAL := 0;
BEGIN
    SELECT last_submission_date, current_streak 
    INTO v_last_submission, v_current_streak
    FROM user_profiles 
    WHERE user_id = p_user_id;
    
    -- Check if streak continues
    IF v_last_submission = CURRENT_DATE - INTERVAL '1 day' THEN
        -- Streak continues
        v_current_streak := v_current_streak + 1;
    ELSIF v_last_submission = CURRENT_DATE THEN
        -- Already submitted today
        NULL;
    ELSE
        -- Streak broken
        v_current_streak := 1;
    END IF;
    
    -- Update user profile
    UPDATE user_profiles 
    SET 
        current_streak = v_current_streak,
        last_submission_date = CURRENT_DATE,
        longest_streak = GREATEST(longest_streak, v_current_streak)
    WHERE user_id = p_user_id;
    
    -- Award streak bonus if applicable
    IF v_current_streak = 3 THEN
        v_streak_bonus := 0.50;
    ELSIF v_current_streak = 7 THEN
        v_streak_bonus := 1.00;
    ELSIF v_current_streak = 30 THEN
        v_streak_bonus := 5.00;
    END IF;
    
    IF v_streak_bonus > 0 THEN
        PERFORM record_earnings_transaction(
            p_user_id,
            'adjustment',
            v_streak_bonus,
            NULL,
            NULL,
            format('%d day streak bonus!', v_current_streak),
            jsonb_build_object('type', 'streak_bonus', 'days', v_current_streak)
        );
    END IF;
    
    RETURN v_current_streak;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to use new calculation
DROP TRIGGER IF EXISTS trigger_trend_submission_earnings ON captured_trends;
CREATE TRIGGER trigger_trend_submission_earnings_v2
    BEFORE INSERT ON captured_trends
    FOR EACH ROW
    EXECUTE FUNCTION (
        NEW.earnings := calculate_trend_earnings_v2(NEW.id, NEW.user_id);
        PERFORM update_user_streak(NEW.user_id);
        RETURN NEW;
    );

-- Sample earnings for different scenarios
DO $$
BEGIN
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'REVISED EARNINGS EXAMPLES';
    RAISE NOTICE '===========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'LEARNING TIER (1x multiplier, $5 cap):';
    RAISE NOTICE '  Basic trend: $1.00';
    RAISE NOTICE '  With screenshot + description: $1.50';
    RAISE NOTICE '  Viral trend (1M+ views): $3.50';
    RAISE NOTICE '  Finance viral trend: $5.00 (capped)';
    RAISE NOTICE '';
    RAISE NOTICE 'VERIFIED TIER (2x multiplier, $10 cap):';
    RAISE NOTICE '  Basic trend: $2.00';
    RAISE NOTICE '  With quality bonuses: $3.00';
    RAISE NOTICE '  Viral trend: $7.00';
    RAISE NOTICE '  Finance viral trend: $10.00 (capped)';
    RAISE NOTICE '';
    RAISE NOTICE 'ELITE TIER (3x multiplier, $25 cap):';
    RAISE NOTICE '  Basic trend: $3.00';
    RAISE NOTICE '  With quality bonuses: $4.50';
    RAISE NOTICE '  Viral trend: $10.50';
    RAISE NOTICE '  Finance viral trend: $25.00 (capped)';
    RAISE NOTICE '  First spotter mega-viral: $25.00 (capped)';
    RAISE NOTICE '';
    RAISE NOTICE 'MASTER TIER (5x multiplier, $50 cap):';
    RAISE NOTICE '  Basic trend: $5.00';
    RAISE NOTICE '  With quality bonuses: $7.50';
    RAISE NOTICE '  Viral trend: $17.50';
    RAISE NOTICE '  Finance viral trend: $43.75';
    RAISE NOTICE '  First spotter mega-viral: $50.00 (capped)';
    RAISE NOTICE '';
    RAISE NOTICE 'SPECIAL BONUSES:';
    RAISE NOTICE '  3-day streak: +$0.50';
    RAISE NOTICE '  7-day streak: +$1.00';
    RAISE NOTICE '  30-day streak: +$5.00';
    RAISE NOTICE '  Refer active user: +$5.00';
    RAISE NOTICE '  Refer power user: +$25.00';
END $$;