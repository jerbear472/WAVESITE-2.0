-- Fix RLS policies for scroll_sessions to allow function access

-- 1. Drop existing policies
DROP POLICY IF EXISTS "Users can manage own scroll sessions" ON scroll_sessions;
DROP POLICY IF EXISTS "Users can view own scroll sessions" ON scroll_sessions;
DROP POLICY IF EXISTS "Users can create own scroll sessions" ON scroll_sessions;
DROP POLICY IF EXISTS "Users can update own scroll sessions" ON scroll_sessions;

-- 2. Create permissive policies
-- Allow users to view their own sessions
CREATE POLICY "Users can view own scroll sessions" ON scroll_sessions
    FOR SELECT USING (auth.uid() = user_id);

-- Allow users to create their own sessions
CREATE POLICY "Users can create own scroll sessions" ON scroll_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own sessions
CREATE POLICY "Users can update own scroll sessions" ON scroll_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. Create a security definer function that bypasses RLS
CREATE OR REPLACE FUNCTION update_session_on_trend_submission_secure(
    p_user_id UUID,
    p_trend_id UUID
) RETURNS JSON 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_session_id UUID;
    v_position INTEGER;
    v_multiplier NUMERIC;
    v_result JSON;
BEGIN
    RAISE NOTICE '[SESSION] Starting update for user: %, trend: %', p_user_id, p_trend_id;
    
    -- Get or create session (5-minute window)
    SELECT id INTO v_session_id
    FROM scroll_sessions
    WHERE user_id = p_user_id
        AND COALESCE(is_active, true) = true
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
            p_user_id,
            NOW(),
            1,
            true
        )
        RETURNING id INTO v_session_id;
        
        v_position := 1;
        RAISE NOTICE '[SESSION] Created new session: %', v_session_id;
    ELSE
        -- Update existing session
        UPDATE scroll_sessions
        SET trends_submitted = COALESCE(trends_submitted, 0) + 1
        WHERE id = v_session_id
        RETURNING trends_submitted INTO v_position;
        
        RAISE NOTICE '[SESSION] Updated existing session: %, position: %', v_session_id, v_position;
    END IF;
    
    -- Calculate multiplier based on position in session
    v_multiplier := CASE
        WHEN v_position >= 5 THEN 2.5  -- 5+ submissions = 2.5x
        WHEN v_position = 4 THEN 2.0   -- 4th submission = 2.0x
        WHEN v_position = 3 THEN 1.5   -- 3rd submission = 1.5x
        WHEN v_position = 2 THEN 1.2   -- 2nd submission = 1.2x
        ELSE 1.0                        -- First submission = 1.0x
    END;
    
    RAISE NOTICE '[SESSION] Position: %, Multiplier: %x', v_position, v_multiplier;
    
    -- Update user_profiles with session streak
    UPDATE user_profiles
    SET 
        session_streak = v_position,
        last_submission_at = NOW()
    WHERE id = p_user_id;
    
    -- Wait a moment for the earnings trigger to create the ledger entry
    PERFORM pg_sleep(0.5);
    
    -- Update earnings with multiplier
    UPDATE earnings_ledger
    SET 
        amount = ROUND(
            (amount / COALESCE((metadata->>'session_multiplier')::NUMERIC, 1.0)) * v_multiplier, 
            2
        ),
        metadata = jsonb_set(
            jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{session_multiplier}',
                to_jsonb(v_multiplier)
            ),
            '{session_position}',
            to_jsonb(v_position)
        )
    WHERE reference_id = p_trend_id
        AND reference_type = 'trend_submissions'
        AND user_id = p_user_id
        AND created_at > NOW() - INTERVAL '2 minutes';
    
    -- Return result as JSON for debugging
    v_result := json_build_object(
        'session_id', v_session_id,
        'position', v_position,
        'multiplier', v_multiplier,
        'success', true
    );
    
    RAISE NOTICE '[SESSION] Complete: %', v_result;
    RETURN v_result;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '[SESSION] Error: %', SQLERRM;
        RETURN json_build_object(
            'error', SQLERRM,
            'success', false
        );
END;
$$ LANGUAGE plpgsql;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION update_session_on_trend_submission_secure TO authenticated;
GRANT EXECUTE ON FUNCTION update_session_on_trend_submission_secure TO anon;

-- 5. Create or replace the trigger to use the secure function
CREATE OR REPLACE FUNCTION handle_trend_submission_with_session()
RETURNS TRIGGER AS $$
BEGIN
    -- Call the secure session update function
    PERFORM update_session_on_trend_submission_secure(NEW.spotter_id, NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop and recreate the trigger
DROP TRIGGER IF EXISTS on_trend_submission_update_session ON trend_submissions;

CREATE TRIGGER on_trend_submission_update_session
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_submission_with_session();

-- 7. Test the function
DO $$
DECLARE
    test_trend_id UUID;
    test_user_id UUID;
    test_result JSON;
BEGIN
    -- Get a recent trend
    SELECT id, spotter_id INTO test_trend_id, test_user_id
    FROM trend_submissions
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_trend_id IS NOT NULL THEN
        -- Call the secure function
        test_result := update_session_on_trend_submission_secure(test_user_id, test_trend_id);
        RAISE NOTICE 'Test result: %', test_result;
        
        -- Check if session was created
        IF EXISTS (
            SELECT 1 FROM scroll_sessions 
            WHERE user_id = test_user_id 
            AND created_at > NOW() - INTERVAL '5 minutes'
        ) THEN
            RAISE NOTICE 'SUCCESS: Session exists for user';
        ELSE
            RAISE NOTICE 'FAILED: No session found';
        END IF;
    END IF;
END $$;

-- 8. Show current state
SELECT 
    'Session Status After Fix' as report,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_sessions,
    MAX(trends_submitted) as max_trends_in_session
FROM scroll_sessions
WHERE created_at > NOW() - INTERVAL '1 hour';