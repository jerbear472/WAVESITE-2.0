-- Fix session streak by ensuring proper function execution order

-- 1. Drop and recreate the update function with better error handling
CREATE OR REPLACE FUNCTION update_session_on_trend_submission(
    p_user_id UUID,
    p_trend_id UUID
) RETURNS JSON AS $$
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
    
    -- Calculate multiplier
    v_multiplier := CASE
        WHEN v_position >= 5 THEN 2.5
        WHEN v_position = 4 THEN 2.0
        WHEN v_position = 3 THEN 1.5
        WHEN v_position = 2 THEN 1.2
        ELSE 1.0
    END;
    
    RAISE NOTICE '[SESSION] Position: %, Multiplier: %x', v_position, v_multiplier;
    
    -- Update user_profiles with session streak
    UPDATE user_profiles
    SET 
        session_streak = v_position,
        last_submission_at = NOW()
    WHERE id = p_user_id;
    
    -- Try to update earnings (wait a bit for trigger to create it)
    PERFORM pg_sleep(0.3);
    
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
        AND created_at > NOW() - INTERVAL '1 minute';
    
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

-- 2. Grant permissions
GRANT EXECUTE ON FUNCTION update_session_on_trend_submission TO authenticated;
GRANT ALL ON scroll_sessions TO authenticated;

-- 3. Ensure RLS is set up correctly
ALTER TABLE scroll_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own scroll sessions" ON scroll_sessions;
DROP POLICY IF EXISTS "Users can create own scroll sessions" ON scroll_sessions;
DROP POLICY IF EXISTS "Users can update own scroll sessions" ON scroll_sessions;

-- Create new policies
CREATE POLICY "Users can manage own scroll sessions" ON scroll_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 4. Test with a manual submission
DO $$
DECLARE
    test_user_id UUID;
    test_result JSON;
BEGIN
    -- Get a user
    SELECT id INTO test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Create a test trend
        INSERT INTO trend_submissions (
            spotter_id,
            title,
            category,
            status,
            payment_amount
        ) VALUES (
            test_user_id,
            'Test for session streak',
            'technology',
            'submitted',
            0.25
        );
        
        -- Call the function
        test_result := update_session_on_trend_submission(
            test_user_id, 
            (SELECT id FROM trend_submissions WHERE spotter_id = test_user_id ORDER BY created_at DESC LIMIT 1)
        );
        
        RAISE NOTICE 'Test result: %', test_result;
    END IF;
END $$;

-- 5. Show current state
SELECT 
    'Session Tracking Status' as report,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_sessions,
    MAX(trends_submitted) as max_trends_in_session,
    COUNT(CASE WHEN trends_submitted > 1 THEN 1 END) as multi_trend_sessions
FROM scroll_sessions
WHERE created_at > NOW() - INTERVAL '24 hours';