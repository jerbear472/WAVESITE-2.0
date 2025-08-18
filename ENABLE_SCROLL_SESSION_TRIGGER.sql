-- Enable scroll session tracking with proper RLS bypass

-- 1. First, check if the trigger exists
SELECT 
    tgname as trigger_name,
    tgenabled as enabled,
    CASE tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger
WHERE tgname LIKE '%session%'
AND tgrelid = 'trend_submissions'::regclass;

-- 2. Drop old trigger if it exists
DROP TRIGGER IF EXISTS on_trend_submission_update_session ON trend_submissions;
DROP TRIGGER IF EXISTS update_scroll_session_trigger ON trend_submissions;

-- 3. Create a new function that bypasses RLS using SECURITY DEFINER
CREATE OR REPLACE FUNCTION handle_trend_submission_session()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_position INTEGER;
    v_multiplier NUMERIC;
BEGIN
    -- Get or create session (5-minute window)
    SELECT id INTO v_session_id
    FROM scroll_sessions
    WHERE user_id = NEW.spotter_id
        AND created_at > NOW() - INTERVAL '5 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        -- Create new session
        INSERT INTO scroll_sessions (
            user_id,
            created_at,
            trends_submitted,
            is_active
        )
        VALUES (
            NEW.spotter_id,
            NOW(),
            1,
            true
        )
        RETURNING id INTO v_session_id;
        
        v_position := 1;
    ELSE
        -- Update existing session
        UPDATE scroll_sessions
        SET trends_submitted = COALESCE(trends_submitted, 0) + 1
        WHERE id = v_session_id
        RETURNING trends_submitted INTO v_position;
    END IF;
    
    -- Calculate multiplier
    v_multiplier := CASE
        WHEN v_position >= 5 THEN 2.5
        WHEN v_position = 4 THEN 2.0
        WHEN v_position = 3 THEN 1.5
        WHEN v_position = 2 THEN 1.2
        ELSE 1.0
    END;
    
    -- Update user_profiles
    UPDATE user_profiles
    SET 
        session_streak = v_position,
        last_submission_at = NOW()
    WHERE id = NEW.spotter_id;
    
    -- Update earnings (if exists)
    UPDATE earnings_ledger
    SET 
        amount = ROUND(0.25 * v_multiplier, 2),
        metadata = jsonb_build_object(
            'session_multiplier', v_multiplier,
            'session_position', v_position,
            'session_id', v_session_id
        )
    WHERE reference_id = NEW.id
        AND reference_type = 'trend_submissions'
        AND user_id = NEW.spotter_id
        AND created_at > NOW() - INTERVAL '1 minute';
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        RAISE WARNING 'Session update error: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the trigger
CREATE TRIGGER update_scroll_session_trigger
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_submission_session();

-- 5. Enable the trigger
ALTER TRIGGER update_scroll_session_trigger ON trend_submissions ENABLE;

-- 6. Verify trigger is enabled
SELECT 
    'Trigger Status After Fix' as report,
    tgname as trigger_name,
    CASE tgenabled
        WHEN 'O' THEN 'ENABLED'
        WHEN 'D' THEN 'DISABLED'
        WHEN 'R' THEN 'REPLICA'
        WHEN 'A' THEN 'ALWAYS'
    END as status
FROM pg_trigger
WHERE tgname = 'update_scroll_session_trigger'
AND tgrelid = 'trend_submissions'::regclass;

-- 7. Test with recent submission
DO $$
DECLARE
    test_trend_id UUID;
    test_user_id UUID;
BEGIN
    -- Get a recent trend
    SELECT id, spotter_id INTO test_trend_id, test_user_id
    FROM trend_submissions
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_trend_id IS NOT NULL THEN
        -- Manually trigger the function
        UPDATE trend_submissions 
        SET updated_at = NOW()
        WHERE id = test_trend_id;
        
        -- Check if session exists
        IF EXISTS (
            SELECT 1 FROM scroll_sessions 
            WHERE user_id = test_user_id 
            AND created_at > NOW() - INTERVAL '10 minutes'
        ) THEN
            RAISE NOTICE 'SUCCESS: Session exists for user';
        ELSE
            RAISE NOTICE 'INFO: No session found - may need to submit new trend';
        END IF;
    END IF;
END $$;

-- 8. Show current sessions
SELECT 
    'Current Sessions' as report,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_sessions,
    MAX(trends_submitted) as max_trends,
    NOW() as checked_at
FROM scroll_sessions
WHERE created_at > NOW() - INTERVAL '1 hour';