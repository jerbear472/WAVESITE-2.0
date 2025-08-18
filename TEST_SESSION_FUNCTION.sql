-- Test if the session update function exists and works

-- 1. Check if the function exists
SELECT 
    proname as function_name,
    pronargs as num_args,
    prosrc as source_preview
FROM pg_proc 
WHERE proname = 'update_session_on_trend_submission';

-- 2. Check recent trend submissions
SELECT 
    ts.id,
    ts.spotter_id,
    ts.title,
    ts.created_at,
    el.amount as earnings_amount,
    el.metadata->>'session_multiplier' as session_mult,
    el.metadata->>'session_position' as session_pos
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id
WHERE ts.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ts.created_at DESC
LIMIT 5;

-- 3. Check scroll_sessions table
SELECT 
    ss.id,
    ss.user_id,
    ss.trends_submitted,
    ss.created_at,
    ss.is_active,
    AGE(NOW(), ss.created_at) as age
FROM scroll_sessions ss
WHERE ss.created_at > NOW() - INTERVAL '1 hour'
ORDER BY ss.created_at DESC
LIMIT 5;

-- 4. Manually test the function with a recent trend
DO $$
DECLARE
    test_user_id UUID;
    test_trend_id UUID;
BEGIN
    -- Get most recent submission
    SELECT spotter_id, id 
    INTO test_user_id, test_trend_id
    FROM trend_submissions
    WHERE created_at > NOW() - INTERVAL '10 minutes'
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF test_trend_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with trend: % for user: %', test_trend_id, test_user_id;
        
        -- Try to call the function
        BEGIN
            PERFORM update_session_on_trend_submission(test_user_id, test_trend_id);
            RAISE NOTICE '✅ Function executed successfully';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Function error: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No recent trends to test';
    END IF;
END $$;

-- 5. Check user_profiles for streak data
SELECT 
    up.id,
    u.email,
    up.current_streak,
    up.session_streak,
    up.last_submission_at,
    NOW() - up.last_submission_at as time_since_last
FROM user_profiles up
JOIN auth.users u ON u.id = up.id
WHERE up.last_submission_at > NOW() - INTERVAL '1 hour'
ORDER BY up.last_submission_at DESC
LIMIT 5;