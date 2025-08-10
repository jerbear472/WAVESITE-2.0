-- FIND THE EXACT SOURCE OF THE AMBIGUITY (FIXED)

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
    left(prosrc, 500) as first_500_chars
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace
ORDER BY issue DESC;

-- 3. Show just the function names with reject_count
SELECT 
    'Functions referencing reject_count:' as category,
    proname as function_name
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

-- 4. Check for views with these tables
SELECT 
    'Views with trend tables:' as category,
    viewname,
    CASE 
        WHEN definition LIKE '%reject_count%' THEN 'Uses reject_count'
        ELSE 'No reject_count'
    END as has_reject_count
FROM pg_views
WHERE schemaname = 'public'
AND (definition LIKE '%trend_submissions%' OR definition LIKE '%trend_validations%');

-- 5. Show triggers grouped by table
SELECT 
    'Triggers on trend_submissions:' as table_name,
    count(*) FILTER (WHERE tgname LIKE 'RI_ConstraintTrigger%') as fk_triggers,
    count(*) FILTER (WHERE tgname NOT LIKE 'RI_ConstraintTrigger%' AND NOT tgisinternal) as custom_triggers
FROM pg_trigger
WHERE tgrelid = 'public.trend_submissions'::regclass;

SELECT 
    'Triggers on trend_validations:' as table_name,
    count(*) FILTER (WHERE tgname LIKE 'RI_ConstraintTrigger%') as fk_triggers,
    count(*) FILTER (WHERE tgname NOT LIKE 'RI_ConstraintTrigger%' AND NOT tgisinternal) as custom_triggers
FROM pg_trigger
WHERE tgrelid = 'public.trend_validations'::regclass;

-- 6. Find the specific problematic function
SELECT 
    proname as function_name,
    'Check this function manually - it likely has the ambiguity' as action
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace
AND proname != 'cast_trend_vote';