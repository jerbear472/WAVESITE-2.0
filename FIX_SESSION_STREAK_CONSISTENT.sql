-- Fix session streak logic to be consistent with 5-minute window

-- 1. Update the get_or_create_scroll_session to use 5-minute window
CREATE OR REPLACE FUNCTION get_or_create_scroll_session(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
    v_session_id UUID;
BEGIN
    -- Find active session within last 5 MINUTES (not 30)
    SELECT id INTO v_session_id
    FROM scroll_sessions
    WHERE user_id = p_user_id
        AND COALESCE(is_active, true) = true
        AND created_at > NOW() - INTERVAL '5 minutes'  -- Changed from 30 to 5 minutes
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Create new session if none found
    IF v_session_id IS NULL THEN
        INSERT INTO scroll_sessions (
            user_id,
            created_at,
            trends_submitted,
            is_active
        )
        VALUES (
            p_user_id,
            NOW(),
            0,
            true
        )
        RETURNING id INTO v_session_id;
    END IF;
    
    RETURN v_session_id;
END;
$$ LANGUAGE plpgsql;

-- 2. Update streak calculation to match 5-minute window for session streaks
CREATE OR REPLACE FUNCTION update_user_streaks_on_submission(p_user_id UUID)
RETURNS RECORD AS $$
DECLARE
    v_last_submission TIMESTAMP;
    v_current_streak INTEGER;
    v_session_position INTEGER;
    v_time_diff INTERVAL;
    v_result RECORD;
BEGIN
    -- Get user's last submission info
    SELECT 
        last_submission_at,
        COALESCE(current_streak, 0)
    INTO v_last_submission, v_current_streak
    FROM user_profiles
    WHERE id = p_user_id;
    
    -- If no profile exists, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (id, current_streak, session_streak, last_submission_at)
        VALUES (p_user_id, 1, 1, NOW())
        ON CONFLICT (id) DO UPDATE
        SET current_streak = 1, session_streak = 1, last_submission_at = NOW();
        
        v_current_streak := 1;
        v_session_position := 1;
    ELSE
        -- Calculate time since last submission
        v_time_diff := NOW() - COALESCE(v_last_submission, NOW() - INTERVAL '2 days');
        
        -- Get session position from active scroll session (5-minute window)
        SELECT COALESCE(trends_submitted, 0) + 1 INTO v_session_position
        FROM scroll_sessions
        WHERE user_id = p_user_id
            AND created_at > NOW() - INTERVAL '5 minutes'  -- 5-minute window
            AND COALESCE(is_active, true) = true
        ORDER BY created_at DESC
        LIMIT 1;
        
        -- If no active session, this is position 1
        v_session_position := COALESCE(v_session_position, 1);
        
        -- Update daily streak (24-hour window)
        IF v_time_diff < INTERVAL '24 hours' THEN
            -- Same day, keep streak
            v_current_streak := GREATEST(v_current_streak, 1);
        ELSIF v_time_diff < INTERVAL '48 hours' THEN
            -- Next day, increment
            v_current_streak := v_current_streak + 1;
        ELSE
            -- Streak broken
            v_current_streak := 1;
        END IF;
        
        -- Update the profile
        UPDATE user_profiles
        SET 
            current_streak = v_current_streak,
            session_streak = v_session_position,
            last_submission_at = NOW(),
            trends_submitted = COALESCE(trends_submitted, 0) + 1
        WHERE id = p_user_id;
    END IF;
    
    -- Return the streaks
    SELECT v_current_streak, v_session_position INTO v_result;
    RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 3. Main function with consistent 5-minute session window
CREATE OR REPLACE FUNCTION update_session_on_trend_submission(
    p_user_id UUID,
    p_trend_id UUID
) RETURNS VOID AS $$
DECLARE
    v_session_id UUID;
    v_position INTEGER;
    v_session_multiplier NUMERIC;
    v_daily_multiplier NUMERIC;
    v_current_amount NUMERIC;
    v_base_amount NUMERIC;
    v_new_amount NUMERIC;
    v_streaks RECORD;
    v_daily_streak INTEGER;
    v_tier_multiplier NUMERIC;
BEGIN
    RAISE NOTICE '=== Session update for trend % ===', p_trend_id;
    
    -- Get or create session (5-minute window)
    v_session_id := get_or_create_scroll_session(p_user_id);
    
    -- Update trends count in session
    UPDATE scroll_sessions
    SET trends_submitted = COALESCE(trends_submitted, 0) + 1
    WHERE id = v_session_id
    RETURNING trends_submitted INTO v_position;
    
    RAISE NOTICE 'Session position: %', v_position;
    
    -- Update user streaks
    v_streaks := update_user_streaks_on_submission(p_user_id);
    v_daily_streak := v_streaks.f1;
    -- Use the actual session position from scroll_sessions
    
    -- Calculate multipliers (matching existing logic)
    v_session_multiplier := CASE
        WHEN v_position >= 5 THEN 2.5
        WHEN v_position = 4 THEN 2.0
        WHEN v_position = 3 THEN 1.5
        WHEN v_position = 2 THEN 1.2
        ELSE 1.0
    END;
    
    v_daily_multiplier := CASE
        WHEN v_daily_streak >= 30 THEN 2.5
        WHEN v_daily_streak >= 14 THEN 2.0
        WHEN v_daily_streak >= 7 THEN 1.5
        WHEN v_daily_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
    
    RAISE NOTICE 'Multipliers - Position: %, Session: %x, Daily: %x', 
        v_position, v_session_multiplier, v_daily_multiplier;
    
    -- Wait for earnings trigger
    PERFORM pg_sleep(0.2);
    
    -- Get the tier multiplier from existing earnings
    SELECT 
        amount,
        COALESCE((metadata->>'tier_multiplier')::NUMERIC, 1.0)
    INTO v_current_amount, v_tier_multiplier
    FROM earnings_ledger
    WHERE reference_id = p_trend_id
        AND reference_type = 'trend_submissions'
        AND user_id = p_user_id
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_current_amount IS NOT NULL THEN
        -- Calculate base (remove all multipliers)
        v_base_amount := v_current_amount / (
            COALESCE((
                SELECT 
                    COALESCE((metadata->>'tier_multiplier')::NUMERIC, 1.0) *
                    COALESCE((metadata->>'session_multiplier')::NUMERIC, 1.0) *
                    COALESCE((metadata->>'daily_multiplier')::NUMERIC, 1.0)
                FROM earnings_ledger
                WHERE reference_id = p_trend_id
                    AND reference_type = 'trend_submissions'
                    AND user_id = p_user_id
                LIMIT 1
            ), v_tier_multiplier)
        );
        
        -- Recalculate with all multipliers
        v_new_amount := ROUND(v_base_amount * v_tier_multiplier * v_session_multiplier * v_daily_multiplier, 2);
        
        -- Cap at $5.00 max per submission
        IF v_new_amount > 5.00 THEN
            v_new_amount := 5.00;
        END IF;
        
        RAISE NOTICE 'Earnings: % → % (base: %, tier: %x, session: %x, daily: %x)', 
            v_current_amount, v_new_amount, v_base_amount, 
            v_tier_multiplier, v_session_multiplier, v_daily_multiplier;
        
        -- Update earnings
        UPDATE earnings_ledger
        SET 
            amount = v_new_amount,
            metadata = jsonb_build_object(
                'base_amount', v_base_amount,
                'tier_multiplier', v_tier_multiplier,
                'session_multiplier', v_session_multiplier,
                'session_position', v_position,
                'daily_multiplier', v_daily_multiplier,
                'daily_streak', v_daily_streak,
                'calculation', format('%s × %sx × %sx × %sx = %s',
                    v_base_amount, v_tier_multiplier, v_session_multiplier, 
                    v_daily_multiplier, v_new_amount)
            )
        WHERE reference_id = p_trend_id
            AND reference_type = 'trend_submissions'
            AND user_id = p_user_id;
        
        -- Also update user's session_streak in profile to match
        UPDATE user_profiles
        SET session_streak = v_position
        WHERE id = p_user_id;
        
        RAISE NOTICE '✅ Updated with all multipliers';
    ELSE
        RAISE WARNING '⚠️ No earnings found for trend %', p_trend_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION get_or_create_scroll_session TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streaks_on_submission TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_on_trend_submission TO authenticated;

-- 5. Test the logic
DO $$
DECLARE
    test_user_id UUID;
    test_session_id UUID;
    v_position INTEGER;
BEGIN
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Create a session
        test_session_id := get_or_create_scroll_session(test_user_id);
        
        -- Check the session
        SELECT trends_submitted INTO v_position
        FROM scroll_sessions
        WHERE id = test_session_id;
        
        RAISE NOTICE 'Test session % has % trends', test_session_id, v_position;
        RAISE NOTICE '✅ Functions updated with consistent 5-minute window';
    END IF;
END $$;

-- 6. Show configuration
SELECT 
    'Session Configuration' as report,
    '5 minutes' as session_window,
    '1.0x → 1.2x → 1.5x → 2.0x → 2.5x' as session_multipliers,
    '24-48 hours' as daily_streak_window,
    '1.0x → 1.2x → 1.5x → 2.0x → 2.5x' as daily_multipliers,
    '$5.00' as max_per_submission;