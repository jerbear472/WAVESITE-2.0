-- Check all triggers on trend_submissions and earnings_ledger tables
-- These might be causing the hang

-- 1. List all triggers on trend_submissions
SELECT 
    t.tgname as trigger_name,
    CASE 
        WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
    END as trigger_event,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'trend_submissions'
    AND NOT t.tgisinternal;

-- 2. List all triggers on earnings_ledger
SELECT 
    t.tgname as trigger_name,
    CASE 
        WHEN t.tgtype & 2 = 2 THEN 'BEFORE'
        ELSE 'AFTER'
    END as trigger_timing,
    CASE 
        WHEN t.tgtype & 4 = 4 THEN 'INSERT'
        WHEN t.tgtype & 8 = 8 THEN 'DELETE'
        WHEN t.tgtype & 16 = 16 THEN 'UPDATE'
    END as trigger_event,
    p.proname as function_name
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'earnings_ledger'
    AND NOT t.tgisinternal;

-- 3. Check for recursive triggers (triggers that might call each other)
WITH trigger_info AS (
    SELECT 
        c.relname as table_name,
        t.tgname as trigger_name,
        p.proname as function_name,
        pg_get_functiondef(p.oid) as function_def
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE c.relname IN ('trend_submissions', 'earnings_ledger', 'user_profiles', 'scroll_sessions')
        AND NOT t.tgisinternal
)
SELECT 
    table_name,
    trigger_name,
    function_name,
    CASE 
        WHEN function_def LIKE '%INSERT INTO earnings_ledger%' THEN 'Inserts into earnings_ledger'
        WHEN function_def LIKE '%UPDATE earnings_ledger%' THEN 'Updates earnings_ledger'
        WHEN function_def LIKE '%INSERT INTO trend_submissions%' THEN 'Inserts into trend_submissions'
        WHEN function_def LIKE '%UPDATE trend_submissions%' THEN 'Updates trend_submissions'
        WHEN function_def LIKE '%UPDATE user_profiles%' THEN 'Updates user_profiles'
        WHEN function_def LIKE '%UPDATE scroll_sessions%' THEN 'Updates scroll_sessions'
        ELSE 'Other operation'
    END as operation
FROM trigger_info
ORDER BY table_name, trigger_name;

-- 4. Temporarily disable problematic triggers (if needed)
-- DO $$
-- BEGIN
--     -- Disable triggers that might be causing issues
--     ALTER TABLE trend_submissions DISABLE TRIGGER ALL;
--     ALTER TABLE earnings_ledger DISABLE TRIGGER ALL;
--     
--     RAISE NOTICE 'Triggers temporarily disabled for debugging';
-- END $$;

-- 5. Check for any locks on the tables
SELECT 
    l.pid,
    l.mode,
    l.granted,
    c.relname as table_name,
    a.query,
    age(clock_timestamp(), a.query_start) as query_duration
FROM pg_locks l
JOIN pg_class c ON l.relation = c.oid
LEFT JOIN pg_stat_activity a ON l.pid = a.pid
WHERE c.relname IN ('trend_submissions', 'earnings_ledger', 'user_profiles', 'scroll_sessions')
    AND a.query NOT LIKE '%pg_locks%'
ORDER BY query_duration DESC;