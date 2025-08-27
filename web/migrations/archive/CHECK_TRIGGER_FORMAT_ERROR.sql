-- Check the current trigger function for format() issues

-- 1. Get the current trigger function definition
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'create_earnings_on_trend_submission';

-- 2. Check if there are any other triggers on trend_submissions
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    t.tgenabled as enabled
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'trend_submissions'
    AND NOT t.tgisinternal
ORDER BY t.tgname;