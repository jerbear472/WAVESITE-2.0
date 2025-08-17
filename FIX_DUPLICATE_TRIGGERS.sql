-- Fix duplicate earnings triggers that might be causing deadlock/timeout

-- Show the current triggers
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE 
        WHEN t.tgenabled = 'D' THEN 'DISABLED'
        WHEN t.tgenabled = 'O' THEN 'ENABLED'
        ELSE 'REPLICA ONLY'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'trend_submissions'
    AND t.tgname IN ('calculate_trend_earnings_trigger', 'create_earnings_on_submission');

-- IMPORTANT: We have duplicate triggers! Disable one of them
-- Option 1: Disable the older/duplicate trigger
ALTER TABLE trend_submissions DISABLE TRIGGER calculate_trend_earnings_trigger;

-- Or if that one should be kept, disable the other:
-- ALTER TABLE trend_submissions DISABLE TRIGGER create_earnings_on_submission;

-- Check which function is better (show their definitions)
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname IN ('calculate_trend_earnings', 'create_earnings_on_trend_submission');

-- Verify the change
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE 
        WHEN t.tgenabled = 'D' THEN 'DISABLED'
        WHEN t.tgenabled = 'O' THEN 'ENABLED'
        ELSE 'REPLICA ONLY'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'trend_submissions'
ORDER BY t.tgname;

-- Also check if there are any row-level security policies that might be causing issues
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('trend_submissions', 'earnings_ledger')
ORDER BY tablename, policyname;

-- Check for any long-running queries that might be blocking
SELECT 
    pid,
    now() - pg_stat_activity.query_start AS duration,
    query,
    state
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
    AND state != 'idle'
ORDER BY duration DESC;

-- Emergency fix: If submission is completely broken, temporarily disable ALL triggers
-- DO $$
-- BEGIN
--     ALTER TABLE trend_submissions DISABLE TRIGGER ALL;
--     RAISE NOTICE 'All triggers on trend_submissions have been DISABLED for debugging';
--     RAISE NOTICE 'Remember to re-enable them after fixing the issue!';
-- END $$;

-- To re-enable all triggers later:
-- ALTER TABLE trend_submissions ENABLE TRIGGER ALL;