-- Verify the cast_trend_vote function exists and is working properly

-- 1. Check if function exists
SELECT 
    proname as function_name,
    pronargs as arg_count,
    pg_get_function_identity_arguments(oid) as parameters,
    prorettype::regtype as return_type
FROM pg_proc 
WHERE proname = 'cast_trend_vote';

-- 2. Check function parameters and return type
SELECT 
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'cast_trend_vote'
AND routine_schema = 'public';

-- 3. Check if the function can be called (will fail for auth but shows if function exists)
-- This should return an auth error, not a "function does not exist" error
DO $$
BEGIN
    -- Try to call the function
    PERFORM cast_trend_vote(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'verify'
    );
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Function call result: %', SQLERRM;
END $$;

-- 4. If function doesn't exist, this message will appear
-- If it does exist, you'll see function details above
SELECT 'Function verification complete. Check results above.' as status;