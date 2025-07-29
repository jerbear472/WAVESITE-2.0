-- Quick fix to check for any database issues that might be causing hanging

-- 1. Check if there are any locks on the trend_submissions table
SELECT 
    pid,
    usename,
    application_name,
    client_addr,
    query_start,
    state,
    query
FROM pg_stat_activity
WHERE query ILIKE '%trend_submissions%'
AND state != 'idle'
ORDER BY query_start;

-- 2. Check if there are any long-running transactions
SELECT 
    pid,
    usename,
    application_name,
    xact_start,
    state_change,
    state,
    query
FROM pg_stat_activity
WHERE xact_start < NOW() - INTERVAL '1 minute'
AND state != 'idle'
ORDER BY xact_start;

-- 3. Check for any blocking locks
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks 
    ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
    AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
    AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
    AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
    AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- 4. Check recent submissions to see if there's a pattern
SELECT 
    id,
    spotter_id,
    category,
    created_at,
    screenshot_url,
    thumbnail_url
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check if there are any triggers that might be slowing things down
SELECT 
    tgname AS trigger_name,
    tgtype,
    proname AS function_name,
    tgenabled
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'trend_submissions'::regclass;

-- 6. Check indexes on the table
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trend_submissions';

-- 7. Force cleanup of any hanging connections (BE CAREFUL WITH THIS)
-- Only run if you see stuck connections above
/*
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE query ILIKE '%trend_submissions%'
AND state != 'idle'
AND query_start < NOW() - INTERVAL '5 minutes';
*/