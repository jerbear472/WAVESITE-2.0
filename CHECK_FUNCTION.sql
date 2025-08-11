-- Check what versions of cast_trend_vote exist
SELECT 
    proname as function_name,
    pg_get_function_arguments(oid) as arguments,
    pg_get_function_result(oid) as returns
FROM pg_proc 
WHERE proname = 'cast_trend_vote';

-- If the function exists and works, test it
SELECT cast_trend_vote(
    '00000000-0000-0000-0000-000000000000'::UUID,
    '00000000-0000-0000-0000-000000000001'::UUID,
    true
);