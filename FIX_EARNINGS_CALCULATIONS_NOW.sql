-- =====================================================
-- FIX EARNINGS CALCULATIONS - URGENT
-- This fixes the $0 earnings issue and ensures proper 
-- multiplier calculations for all submissions
-- =====================================================

-- First, ensure the earnings_ledger table has proper structure
ALTER TABLE earnings_ledger 
ADD COLUMN IF NOT EXISTS type TEXT,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Ensure trend_submissions has payment_amount column
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 0.25;

-- Create or replace the trigger function for trend_submissions
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
    
    -- If no profile exists, create default values
    IF v_user_tier IS NULL THEN
        v_user_tier := 'learning';
        v_daily_streak := 0;
        v_session_position := 1;
    END IF;
    
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
    
    -- Calculate multipliers using the System 1 standard
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(v_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    -- IMPORTANT: Set the payment_amount on the trend submission
    NEW.payment_amount := v_final_amount;
    
    -- Build description with multiplier breakdown
    v_description := format(
        'Trend submission: Base $%s × %s(%sx) × Session #%s(%sx) × %s-day streak(%sx) = $%s',
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_session_position,
        v_session_multiplier,
        v_daily_streak,
        v_daily_multiplier,
        v_final_amount
    );
    
    -- Update user's session tracking
    UPDATE user_profiles
    SET 
        session_streak = v_session_position,
        last_submission_at = NOW(),
        last_active = NOW()
    WHERE user_id = NEW.spotter_id;
    
    -- Create or update earnings ledger entry
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        transaction_type,
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.spotter_id,
        v_final_amount,
        'trend_submission',
        'trend_submission',
        'pending',
        v_description,
        NEW.id,
        'trend_submissions',
        jsonb_build_object(
            'base_amount', v_base_amount,
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'session_position', v_session_position,
            'session_multiplier', v_session_multiplier,
            'daily_streak', v_daily_streak,
            'daily_multiplier', v_daily_multiplier,
            'category', NEW.category
        )
    )
    ON CONFLICT (id) DO UPDATE SET
        amount = EXCLUDED.amount,
        description = EXCLUDED.description,
        metadata = EXCLUDED.metadata;
    
    RAISE NOTICE 'Earnings calculated: $% for user % (tier: %, session: %, daily: %)', 
        v_final_amount, NEW.spotter_id, v_user_tier, v_session_position, v_daily_streak;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;

-- Create the trigger
CREATE TRIGGER calculate_trend_submission_earnings_trigger
    BEFORE INSERT OR UPDATE ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trend_submission_earnings();

-- Fix existing records with $0 earnings
UPDATE trend_submissions ts
SET payment_amount = 
    ROUND(
        0.25 * -- base amount
        get_tier_multiplier(COALESCE(up.performance_tier, 'learning')) *
        get_session_streak_multiplier(1) * -- default to 1 for historical
        get_daily_streak_multiplier(COALESCE(up.current_streak, 0)),
        2
    )
FROM user_profiles up
WHERE ts.spotter_id = up.user_id
AND ts.payment_amount = 0;

-- Update earnings_ledger entries with $0
UPDATE earnings_ledger el
SET amount = 
    ROUND(
        0.25 * -- base amount
        get_tier_multiplier(COALESCE(up.performance_tier, 'learning')) *
        get_session_streak_multiplier(COALESCE((el.metadata->>'session_position')::INTEGER, 1)) *
        get_daily_streak_multiplier(COALESCE((el.metadata->>'daily_streak')::INTEGER, 0)),
        2
    ),
    metadata = el.metadata || jsonb_build_object(
        'base_amount', 0.25,
        'tier', COALESCE(up.performance_tier, 'learning'),
        'tier_multiplier', get_tier_multiplier(COALESCE(up.performance_tier, 'learning')),
        'session_multiplier', get_session_streak_multiplier(COALESCE((el.metadata->>'session_position')::INTEGER, 1)),
        'daily_multiplier', get_daily_streak_multiplier(COALESCE((el.metadata->>'daily_streak')::INTEGER, 0))
    )
FROM user_profiles up
WHERE el.user_id = up.user_id
AND el.amount = 0
AND el.type = 'trend_submission';

-- Calculate total pending and approved earnings for each user
WITH earnings_summary AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_total
    FROM earnings_ledger
    GROUP BY user_id
)
UPDATE user_profiles up
SET 
    earnings_pending = es.pending_total,
    earnings_approved = es.approved_total,
    earnings_paid = es.paid_total,
    total_earnings = es.pending_total + es.approved_total + es.paid_total
FROM earnings_summary es
WHERE up.user_id = es.user_id;

-- Verify the fix
DO $$
DECLARE
    v_zero_count INTEGER;
    v_total_count INTEGER;
    v_avg_earnings DECIMAL;
BEGIN
    SELECT COUNT(*) INTO v_zero_count
    FROM earnings_ledger 
    WHERE amount = 0 AND type = 'trend_submission';
    
    SELECT COUNT(*) INTO v_total_count
    FROM earnings_ledger 
    WHERE type = 'trend_submission';
    
    SELECT AVG(amount) INTO v_avg_earnings
    FROM earnings_ledger 
    WHERE type = 'trend_submission' AND amount > 0;
    
    RAISE NOTICE '======================================';
    RAISE NOTICE '✅ EARNINGS FIX APPLIED';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Total trend submissions: %', v_total_count;
    RAISE NOTICE 'Zero earnings fixed: %', v_zero_count;
    RAISE NOTICE 'Average earnings per trend: $%', COALESCE(v_avg_earnings, 0.25);
    RAISE NOTICE '======================================';
END $$;