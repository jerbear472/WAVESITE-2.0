-- Check what RPC functions exist
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
AND routine_name LIKE '%vote%' OR routine_name LIKE '%trend%' OR routine_name LIKE '%validation%'
ORDER BY routine_name;

-- Check specifically for cast_trend_vote
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'cast_trend_vote';

-- Get the definition of cast_trend_vote if it exists
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'cast_trend_vote' 
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');