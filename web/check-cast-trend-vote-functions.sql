-- Check all versions of cast_trend_vote function that exist
-- This helps identify which signatures are present

SELECT 
    n.nspname AS schema,
    p.proname AS function_name,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
    pg_catalog.pg_get_function_result(p.oid) AS return_type,
    p.prosrc AS function_body_preview
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'cast_trend_vote'
ORDER BY n.nspname, p.proname;

-- Also check the trend_validations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_validations'
ORDER BY ordinal_position;

-- Check if there are any triggers that might be causing the issue
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trend_validations';

-- Alternative way to list all cast_trend_vote functions with full signatures
\df cast_trend_vote