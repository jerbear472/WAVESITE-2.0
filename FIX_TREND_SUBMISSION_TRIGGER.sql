-- =====================================================
-- FIX TREND SUBMISSION TRIGGER
-- Ensures earnings are calculated when trends are submitted
-- =====================================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS create_earnings_on_trend_submission ON trend_submissions;

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION calculate_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.25;
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
    v_user_id UUID;
BEGIN
    -- Get the user ID (handle both spotter_id and user_id)
    v_user_id := COALESCE(NEW.spotter_id, NEW.user_id);
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No user ID found in submission';
    END IF;
    
    -- Get user profile data (using 'id' column which is the primary key)
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0),
        last_submission_at,
        COALESCE(session_streak, 0)
    INTO v_user_tier, v_daily_streak, v_last_submission, v_session_position
    FROM user_profiles 
    WHERE id = v_user_id;
    
    -- If no profile exists, use defaults
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
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    v_daily_multiplier := get_daily_streak_multiplier(v_daily_streak);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
    
    -- Update the trend submission with calculated values
    NEW.payment_amount := COALESCE(NEW.payment_amount, v_final_amount);
    NEW.tier_multiplier := v_tier_multiplier;
    NEW.session_multiplier := v_session_multiplier;
    NEW.daily_multiplier := v_daily_multiplier;
    NEW.session_position := v_session_position;
    NEW.earnings := v_final_amount;
    NEW.earnings_status := 'pending';
    
    -- Build description
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
    WHERE id = v_user_id;
    
    -- Create earnings ledger entry
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
        v_user_id,
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
            'category', NEW.category,
            'trend_title', COALESCE(NEW.title, NEW.description)
        )
    );
    
    RAISE NOTICE 'Earnings calculated: $% for user % (tier: %, session: %, daily: %)', 
        v_final_amount, v_user_id, v_user_tier, v_session_position, v_daily_streak;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER calculate_trend_submission_earnings_trigger
    BEFORE INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION calculate_trend_submission_earnings();

-- Grant permissions
GRANT EXECUTE ON FUNCTION calculate_trend_submission_earnings TO authenticated;

-- Test with a simple verification
DO $$
BEGIN
    RAISE NOTICE '✅ Trend submission trigger created successfully!';
    RAISE NOTICE '📊 Earnings will be calculated automatically on submission';
    RAISE NOTICE '💰 Base: $0.25 × tier × session × daily streak';
END $$;