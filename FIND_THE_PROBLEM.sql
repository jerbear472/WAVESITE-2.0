-- FIND WHAT'S CAUSING THE AMBIGUOUS COLUMN ERROR

-- Check 1: Find ALL objects referencing reject_count
SELECT 
    'FUNCTION' as type,
    proname as name,
    'DROP FUNCTION ' || proname || '() CASCADE;' as fix_command
FROM pg_proc
WHERE prosrc LIKE '%reject_count%'
AND pronamespace = 'public'::regnamespace;

-- Check 2: Find ALL views referencing these tables
SELECT 
    'VIEW' as type,
    viewname as name,
    'DROP VIEW ' || viewname || ' CASCADE;' as fix_command
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%trend_submissions%';

-- Check 3: Find ALL triggers
SELECT 
    'TRIGGER' as type,
    tgname as name,
    'DROP TRIGGER ' || tgname || ' ON ' || tgrelid::regclass || ' CASCADE;' as fix_command
FROM pg_trigger
WHERE tgrelid IN (
    'public.trend_submissions'::regclass,
    'public.trend_validations'::regclass
);

-- Check 4: Show the actual function that's being called
SELECT 
    proname,
    prosrc
FROM pg_proc
WHERE proname = 'cast_trend_vote'
AND pronamespace = 'public'::regnamespace;

-- Check 5: Find if there's a generated column
SELECT 
    attname as column_name,
    attgenerated as is_generated
FROM pg_attribute
WHERE attrelid = 'public.trend_submissions'::regclass
AND attname IN ('approve_count', 'reject_count');

-- Check 6: Look for rules
SELECT 
    'RULE' as type,
    rulename as name,
    'DROP RULE ' || rulename || ' ON ' || ev_class::regclass || ' CASCADE;' as fix_command
FROM pg_rewrite
WHERE ev_class IN (
    'public.trend_submissions'::regclass,
    'public.trend_validations'::regclass
)
AND rulename != '_RETURN';