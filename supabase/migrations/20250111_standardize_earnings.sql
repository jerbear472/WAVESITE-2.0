-- ============================================
-- STANDARDIZED EARNINGS SYSTEM MIGRATION
-- Version: 1.0.0
-- Date: 2025-01-11
-- 
-- This migration aligns the database with EARNINGS_STANDARD.ts
-- ensuring consistent earning calculations across the entire application.
-- ============================================

-- ============================================
-- STEP 1: Add/Update Required Columns
-- ============================================

-- Ensure user_profiles has all necessary columns
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS daily_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS daily_earnings_date DATE,
ADD COLUMN IF NOT EXISTS spotter_tier TEXT DEFAULT 'learning' CHECK (spotter_tier IN ('elite', 'verified', 'learning', 'restricted')),
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMPTZ;

-- Ensure trend_submissions has earning columns
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 0.70,
ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,2) DEFAULT 1.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earning_status TEXT DEFAULT 'pending' CHECK (earning_status IN ('pending', 'approved', 'paid', 'cancelled')),
ADD COLUMN IF NOT EXISTS approval_bonus_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS applied_bonuses JSONB DEFAULT '[]'::jsonb;

-- Ensure trend_validations has correct reward amount
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS reward_amount DECIMAL(10,2) DEFAULT 0.02,
ADD COLUMN IF NOT EXISTS reward_status TEXT DEFAULT 'pending' CHECK (reward_status IN ('pending', 'approved', 'paid', 'cancelled'));

-- Add columns for tracking hashtags, platforms, etc. if missing
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS other_platforms TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS age_ranges JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS subcultures JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS views_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_finance_trend BOOLEAN DEFAULT FALSE;

-- ============================================
-- STEP 2: Create Standardized Calculation Functions
-- ============================================

-- Drop old functions to avoid conflicts
DROP FUNCTION IF EXISTS calculate_trend_submission_earnings CASCADE;
DROP FUNCTION IF EXISTS calculate_validation_earnings CASCADE;
DROP FUNCTION IF EXISTS handle_trend_approval CASCADE;
DROP FUNCTION IF EXISTS get_streak_multiplier CASCADE;
DROP FUNCTION IF EXISTS update_daily_earnings CASCADE;

-- Function to get streak multiplier (matches EARNINGS_STANDARD.ts)
CREATE OR REPLACE FUNCTION get_streak_multiplier(p_streak_count INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    IF p_streak_count >= 15 THEN RETURN 3.0;
    ELSIF p_streak_count >= 10 THEN RETURN 2.5;
    ELSIF p_streak_count >= 5 THEN RETURN 2.0;
    ELSIF p_streak_count >= 3 THEN RETURN 1.5;
    ELSIF p_streak_count >= 2 THEN RETURN 1.2;
    ELSE RETURN 1.0;
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate trend submission earnings
CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 1.00; -- EARNINGS_STANDARD.BASE_RATES.TREND_SUBMISSION
    v_bonus_amount DECIMAL(10,2) := 0.00;
    v_tier_multiplier DECIMAL(3,2);
    v_streak_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_spotter_tier TEXT;
    v_current_streak INTEGER;
    v_applied_bonuses JSONB := '[]'::jsonb;
    v_engagement_rate DECIMAL(5,4);
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get spotter tier and streak
    SELECT spotter_tier, current_streak 
    INTO v_spotter_tier, v_current_streak
    FROM user_profiles
    WHERE id = NEW.spotter_id;

    -- Calculate tier multiplier (EARNINGS_STANDARD.TIER_MULTIPLIERS)
    v_tier_multiplier := CASE v_spotter_tier
        WHEN 'elite' THEN 1.5
        WHEN 'verified' THEN 1.0
        WHEN 'learning' THEN 0.7
        WHEN 'restricted' THEN 0.3
        ELSE 0.7
    END;

    -- Get streak multiplier
    v_streak_multiplier := get_streak_multiplier(COALESCE(v_current_streak, 0));

    -- QUALITY BONUSES (EARNINGS_STANDARD.QUALITY_BONUSES)
    
    -- Screenshot bonus: 0.15
    IF NEW.screenshot_url IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.15;
        v_applied_bonuses := v_applied_bonuses || '["📸 Screenshot"]'::jsonb;
    END IF;

    -- Complete info bonus: 0.10
    IF NEW.trend_name IS NOT NULL AND NEW.description IS NOT NULL AND LENGTH(NEW.description) > 20 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
        v_applied_bonuses := v_applied_bonuses || '["📝 Complete Info"]'::jsonb;
    END IF;

    -- Demographics bonus: 0.10
    IF NEW.age_ranges IS NOT NULL AND jsonb_array_length(NEW.age_ranges) > 0 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
        v_applied_bonuses := v_applied_bonuses || '["👥 Demographics"]'::jsonb;
    END IF;

    -- Subcultures bonus: 0.10
    IF NEW.subcultures IS NOT NULL AND jsonb_array_length(NEW.subcultures) > 0 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
        v_applied_bonuses := v_applied_bonuses || '["🎭 Subcultures"]'::jsonb;
    END IF;

    -- Multi-platform bonus: 0.10
    IF NEW.other_platforms IS NOT NULL AND array_length(NEW.other_platforms, 1) > 0 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
        v_applied_bonuses := v_applied_bonuses || '["🌐 Multi-Platform"]'::jsonb;
    END IF;

    -- Creator info bonus: 0.05
    IF NEW.creator_handle IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.05;
        v_applied_bonuses := v_applied_bonuses || '["👤 Creator Info"]'::jsonb;
    END IF;

    -- Rich hashtags bonus: 0.05
    IF NEW.hashtags IS NOT NULL AND array_length(NEW.hashtags, 1) >= 3 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
        v_applied_bonuses := v_applied_bonuses || '["#️⃣ Hashtags"]'::jsonb;
    END IF;

    -- Caption bonus: 0.05
    IF NEW.post_caption IS NOT NULL AND LENGTH(NEW.post_caption) > 10 THEN
        v_bonus_amount := v_bonus_amount + 0.05;
        v_applied_bonuses := v_applied_bonuses || '["💬 Caption"]'::jsonb;
    END IF;

    -- PERFORMANCE BONUSES (EARNINGS_STANDARD.PERFORMANCE_BONUSES)
    
    -- Viral content bonus: 0.50 (1M+ views)
    -- High views bonus: 0.25 (100k+ views)
    IF NEW.views_count >= 1000000 THEN
        v_bonus_amount := v_bonus_amount + 0.50;
        v_applied_bonuses := v_applied_bonuses || '["🔥 Viral (1M+ views)"]'::jsonb;
    ELSIF NEW.views_count >= 100000 THEN
        v_bonus_amount := v_bonus_amount + 0.25;
        v_applied_bonuses := v_applied_bonuses || '["👀 High Views (100k+)"]'::jsonb;
    END IF;

    -- High engagement bonus: 0.20 (>10% engagement rate)
    IF NEW.views_count > 0 AND NEW.likes_count > 0 THEN
        v_engagement_rate := NEW.likes_count::DECIMAL / NEW.views_count::DECIMAL;
        IF v_engagement_rate > 0.1 THEN
            v_bonus_amount := v_bonus_amount + 0.20;
            v_applied_bonuses := v_applied_bonuses || '["💯 High Engagement"]'::jsonb;
        END IF;
    END IF;

    -- High wave score bonus: 0.20 (>70)
    IF NEW.wave_score > 70 THEN
        v_bonus_amount := v_bonus_amount + 0.20;
        v_applied_bonuses := v_applied_bonuses || '["🌊 High Wave Score"]'::jsonb;
    END IF;

    -- Finance trend bonus: 0.10
    IF NEW.is_finance_trend = TRUE OR NEW.category IN ('finance', 'crypto', 'stocks', 'trading') THEN
        v_bonus_amount := v_bonus_amount + 0.10;
        v_applied_bonuses := v_applied_bonuses || '["📈 Finance Trend"]'::jsonb;
    END IF;

    -- Add tier description to bonuses
    v_applied_bonuses := v_applied_bonuses || 
        CASE v_spotter_tier
            WHEN 'elite' THEN '["🏆 Elite Tier (1.5x)"]'::jsonb
            WHEN 'verified' THEN '["✅ Verified Tier (1.0x)"]'::jsonb
            WHEN 'learning' THEN '["📚 Learning Tier (0.7x)"]'::jsonb
            WHEN 'restricted' THEN '["⚠️ Restricted Tier (0.3x)"]'::jsonb
            ELSE '["📚 Learning Tier (0.7x)"]'::jsonb
        END;

    -- Add streak bonus description if applicable
    IF v_streak_multiplier > 1 THEN
        v_applied_bonuses := v_applied_bonuses || 
            format('["🔥 %sx Streak Bonus"]', v_streak_multiplier)::jsonb;
    END IF;

    -- Calculate final amount with multipliers
    v_final_amount := (v_base_amount + v_bonus_amount) * v_tier_multiplier * v_streak_multiplier;
    
    -- Apply cap (EARNINGS_STANDARD.LIMITS.MAX_SINGLE_SUBMISSION)
    IF v_final_amount > 3.00 THEN
        v_final_amount := 3.00;
        v_applied_bonuses := v_applied_bonuses || '["🔒 Capped at $3.00"]'::jsonb;
    END IF;

    -- Update the submission record
    NEW.base_amount := v_base_amount;
    NEW.bonus_amount := v_bonus_amount;
    NEW.tier_multiplier := v_tier_multiplier;
    NEW.streak_multiplier := v_streak_multiplier;
    NEW.total_earned := v_final_amount;
    NEW.applied_bonuses := v_applied_bonuses;
    NEW.earning_status := 'pending';

    -- Add to user's PENDING earnings
    UPDATE user_profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + v_final_amount,
        trends_spotted = COALESCE(trends_spotted, 0) + 1,
        current_streak = COALESCE(current_streak, 0) + 1,
        last_submission_at = NOW()
    WHERE id = NEW.spotter_id;

    -- Update daily earnings tracking
    PERFORM update_daily_earnings(NEW.spotter_id, v_final_amount);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle validation earnings
CREATE OR REPLACE FUNCTION calculate_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.10; -- EARNINGS_STANDARD.BASE_RATES.VALIDATION_VOTE
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_validator_tier TEXT;
BEGIN
    -- Only process on INSERT
    IF TG_OP != 'INSERT' THEN
        RETURN NEW;
    END IF;

    -- Get validator tier
    SELECT spotter_tier INTO v_validator_tier
    FROM user_profiles
    WHERE id = NEW.validator_id;

    -- Calculate tier multiplier
    v_tier_multiplier := CASE v_validator_tier
        WHEN 'elite' THEN 1.5
        WHEN 'verified' THEN 1.0
        WHEN 'learning' THEN 0.7
        WHEN 'restricted' THEN 0.3
        ELSE 0.7
    END;

    -- Calculate final amount
    v_final_amount := v_base_amount * v_tier_multiplier;

    -- Update validation record
    NEW.reward_amount := v_final_amount;
    NEW.reward_status := 'approved'; -- Validations are immediately approved

    -- Add to user's APPROVED earnings (validations are immediately approved)
    UPDATE user_profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + v_final_amount,
        total_earnings = COALESCE(total_earnings, 0) + v_final_amount
    WHERE id = NEW.validator_id;

    -- Update daily earnings tracking
    PERFORM update_daily_earnings(NEW.validator_id, v_final_amount);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to handle trend approval/rejection
CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_approval_bonus DECIMAL(10,2) := 0.50; -- EARNINGS_STANDARD.BASE_RATES.APPROVAL_BONUS
    v_tier_multiplier DECIMAL(3,2);
    v_bonus_amount DECIMAL(10,2);
    v_spotter_tier TEXT;
BEGIN
    -- Only process when validation_status changes
    IF OLD.validation_status IS DISTINCT FROM NEW.validation_status THEN
        
        -- If trend is approved
        IF NEW.validation_status = 'approved' THEN
            -- Get spotter tier
            SELECT spotter_tier INTO v_spotter_tier
            FROM user_profiles
            WHERE id = NEW.spotter_id;

            -- Calculate tier multiplier
            v_tier_multiplier := CASE v_spotter_tier
                WHEN 'elite' THEN 1.5
                WHEN 'verified' THEN 1.0
                WHEN 'learning' THEN 0.7
                WHEN 'restricted' THEN 0.3
                ELSE 0.7
            END;

            -- Calculate approval bonus
            v_bonus_amount := v_approval_bonus * v_tier_multiplier;

            -- Move pending earnings to approved and add approval bonus
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned),
                earnings_approved = COALESCE(earnings_approved, 0) + NEW.total_earned + v_bonus_amount,
                total_earnings = COALESCE(total_earnings, 0) + NEW.total_earned + v_bonus_amount
            WHERE id = NEW.spotter_id;

            -- Update trend status
            NEW.earning_status := 'approved';
            NEW.approval_bonus_paid := TRUE;

        -- If trend is rejected
        ELSIF NEW.validation_status = 'rejected' THEN
            -- Remove from pending earnings
            UPDATE user_profiles
            SET 
                earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - NEW.total_earned),
                trends_spotted = GREATEST(0, COALESCE(trends_spotted, 0) - 1)
            WHERE id = NEW.spotter_id;

            -- Update trend status
            NEW.earning_status := 'cancelled';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to update daily earnings tracking
CREATE OR REPLACE FUNCTION update_daily_earnings(p_user_id UUID, p_amount DECIMAL)
RETURNS VOID AS $$
DECLARE
    v_current_date DATE := CURRENT_DATE;
    v_current_daily DECIMAL(10,2);
    v_max_daily DECIMAL(10,2) := 50.00; -- EARNINGS_STANDARD.LIMITS.MAX_DAILY_EARNINGS
BEGIN
    -- Get current daily earnings
    SELECT daily_earnings, daily_earnings_date 
    INTO v_current_daily
    FROM user_profiles
    WHERE id = p_user_id;

    -- Reset if it's a new day
    IF daily_earnings_date IS NULL OR daily_earnings_date < v_current_date THEN
        v_current_daily := 0;
    END IF;

    -- Update daily earnings (capped at max)
    UPDATE user_profiles
    SET 
        daily_earnings = LEAST(v_max_daily, COALESCE(v_current_daily, 0) + p_amount),
        daily_earnings_date = v_current_date
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 3: Create/Update Triggers
-- ============================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_trend_submission_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS on_validation_earnings ON public.trend_validations;
DROP TRIGGER IF EXISTS on_trend_status_change ON public.trend_submissions;

-- Create new triggers
CREATE TRIGGER on_trend_submission_earnings
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW EXECUTE FUNCTION calculate_trend_submission_earnings();

CREATE TRIGGER on_validation_earnings
    BEFORE INSERT ON public.trend_validations
    FOR EACH ROW EXECUTE FUNCTION calculate_validation_earnings();

CREATE TRIGGER on_trend_status_change
    BEFORE UPDATE ON public.trend_submissions
    FOR EACH ROW EXECUTE FUNCTION handle_trend_approval();

-- ============================================
-- STEP 4: Create Helper Functions
-- ============================================

-- Function to get user earnings summary
CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL,
    approved_earnings DECIMAL,
    paid_earnings DECIMAL,
    total_lifetime DECIMAL,
    today_earnings DECIMAL,
    can_cash_out BOOLEAN,
    current_streak INTEGER,
    spotter_tier TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(up.earnings_pending, 0.00),
        COALESCE(up.earnings_approved, 0.00),
        COALESCE(up.earnings_paid, 0.00),
        COALESCE(up.total_earnings, 0.00),
        CASE 
            WHEN up.daily_earnings_date = CURRENT_DATE 
            THEN COALESCE(up.daily_earnings, 0.00)
            ELSE 0.00
        END,
        COALESCE(up.earnings_approved, 0.00) >= 5.00, -- MIN_CASHOUT_AMOUNT
        COALESCE(up.current_streak, 0),
        COALESCE(up.spotter_tier, 'learning')
    FROM user_profiles up
    WHERE up.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_earnings_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_streak_multiplier TO authenticated;

-- ============================================
-- STEP 5: Create Indexes for Performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trend_submissions_earning_status 
    ON public.trend_submissions(earning_status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_earnings 
    ON public.trend_submissions(spotter_id, earning_status, total_earned);
CREATE INDEX IF NOT EXISTS idx_trend_validations_reward_status 
    ON public.trend_validations(reward_status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_earnings 
    ON public.user_profiles(earnings_pending, earnings_approved);

-- ============================================
-- STEP 6: Add Comments for Documentation
-- ============================================

COMMENT ON COLUMN public.trend_submissions.base_amount IS 'Base earning amount ($1.00 standard)';
COMMENT ON COLUMN public.trend_submissions.bonus_amount IS 'Sum of all quality and performance bonuses';
COMMENT ON COLUMN public.trend_submissions.tier_multiplier IS 'Multiplier based on spotter tier (0.3-1.5x)';
COMMENT ON COLUMN public.trend_submissions.streak_multiplier IS 'Multiplier based on submission streak (1.0-3.0x)';
COMMENT ON COLUMN public.trend_submissions.total_earned IS 'Final calculated earning amount';
COMMENT ON COLUMN public.trend_submissions.earning_status IS 'Status: pending, approved, paid, or cancelled';
COMMENT ON COLUMN public.trend_submissions.applied_bonuses IS 'JSON array of applied bonus descriptions';

COMMENT ON COLUMN public.user_profiles.earnings_pending IS 'Earnings awaiting trend approval';
COMMENT ON COLUMN public.user_profiles.earnings_approved IS 'Approved earnings ready for cashout';
COMMENT ON COLUMN public.user_profiles.earnings_paid IS 'Total earnings already cashed out';
COMMENT ON COLUMN public.user_profiles.total_earnings IS 'Lifetime total earnings (approved + paid)';
COMMENT ON COLUMN public.user_profiles.spotter_tier IS 'User tier: elite, verified, learning, or restricted';

-- ============================================
-- Migration Complete
-- ============================================