-- FIND THE EXACT SOURCE OF THE AMBIGUITY

-- 1. Show ALL custom triggers (not foreign key constraints)
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    proname as function_called
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid IN ('public.trend_submissions'::regclass, 'public.trend_validations'::regclass)
AND tgname NOT LIKE 'RI_ConstraintTrigger%'
AND NOT tgisinternal
ORDER BY table_name, trigger_name;

-- 2. Show functions that might have the ambiguous reference
SELECT 
    proname as function_name,
    CASE 
        WHEN prosrc LIKE '%FROM%trend_submissions%trend_validations%' 
            OR prosrc LIKE '%FROM%trend_validations%trend_submissions%' 
        THEN 'HAS JOIN - PROBLEM!'
        WHEN prosrc LIKE '%JOIN%' AND prosrc LIKE '%reject_count%' 
        THEN 'HAS JOIN WITH reject_count - PROBLEM!'
        WHEN prosrc LIKE '%reject_count%' 
            AND prosrc NOT LIKE '%ts.reject_count%' 
            AND prosrc NOT LIKE '%trend_submissions.reject_count%'
            AND prosrc NOT LIKE '%tv.reject_count%'
        THEN 'UNQUALIFIED reject_count - PROBLEM!'
        ELSE 'Probably OK'
    END as issue,
    substring(prosrc from '.*reject_count.*' for 200) as code_snippet
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace
ORDER BY issue DESC;

-- 3. Check for views with these tables
SELECT 
    viewname,
    CASE 
        WHEN definition LIKE '%reject_count%' 
            AND definition NOT LIKE '%ts.reject_count%'
            AND definition NOT LIKE '%trend_submissions.reject_count%'
        THEN 'UNQUALIFIED reject_count - PROBLEM!'
        ELSE 'OK'
    END as issue
FROM pg_views
WHERE schemaname = 'public'
AND (definition LIKE '%trend_submissions%' OR definition LIKE '%trend_validations%');

-- 4. Show the exact error context - what's being executed when error occurs
SELECT 
    'To debug the exact error, run this and check the error message:' as instruction,
    'SELECT * FROM cast_trend_vote(''<some_trend_id>''::uuid, ''verify'');' as test_command;

-- 5. Check if there are any event triggers
SELECT 
    evtname as event_trigger_name,
    evtevent as event,
    proname as function_name
FROM pg_event_trigger et
JOIN pg_proc p ON p.oid = et.evtfoid
WHERE evtenabled != 'D';