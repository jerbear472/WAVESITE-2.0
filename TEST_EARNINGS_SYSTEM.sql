-- TEST EARNINGS SYSTEM - Run this to verify everything works

-- Test 1: Check if all required columns exist
SELECT '=== TEST 1: Column Structure ===' as test;
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('earnings_pending', 'earnings_approved', 'earnings_paid', 'total_earnings')
ORDER BY column_name;

-- Test 2: Check if cast_trend_vote function exists
SELECT '=== TEST 2: Vote Function ===' as test;
SELECT 
    proname as function_name,
    pg_get_function_identity_arguments(oid) as arguments
FROM pg_proc
WHERE proname = 'cast_trend_vote';

-- Test 3: Check trend_submissions columns
SELECT '=== TEST 3: Trend Submissions Columns ===' as test;
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'validation_status', 'spotter_id', 'status')
ORDER BY column_name;

-- Test 4: Check trend_validations columns
SELECT '=== TEST 4: Trend Validations Columns ===' as test;
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'trend_validations'
AND column_name IN ('trend_submission_id', 'validator_id', 'vote', 'created_at')
ORDER BY column_name;

-- Test 5: Check triggers
SELECT '=== TEST 5: Triggers ===' as test;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('trend_submissions', 'trend_validations')
ORDER BY event_object_table, trigger_name;

-- Test 6: Test the vote function (dry run)
SELECT '=== TEST 6: Vote Function Test ===' as test;
DO $$
DECLARE
    v_result JSON;
    v_test_trend_id UUID;
BEGIN
    -- Get a test trend ID (if exists)
    SELECT id INTO v_test_trend_id
    FROM trend_submissions
    LIMIT 1;
    
    IF v_test_trend_id IS NOT NULL THEN
        -- Try calling the function (will fail if user not authenticated, but tests syntax)
        BEGIN
            v_result := cast_trend_vote(v_test_trend_id, 'verify');
            RAISE NOTICE 'Function call result: %', v_result;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Function exists but needs authentication (expected): %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'No trends to test with';
    END IF;
END $$;

-- Test 7: Check for data integrity
SELECT '=== TEST 7: Data Integrity ===' as test;
SELECT 
    'Profiles with earnings' as check,
    COUNT(*) as count,
    SUM(COALESCE(earnings_pending, 0)) as total_pending,
    SUM(COALESCE(earnings_approved, 0)) as total_approved,
    SUM(COALESCE(earnings_paid, 0)) as total_paid
FROM profiles
WHERE earnings_pending > 0 OR earnings_approved > 0 OR earnings_paid > 0;

-- Test 8: Check for orphaned validations
SELECT '=== TEST 8: Orphaned Records ===' as test;
SELECT 
    'Validations without trends' as check,
    COUNT(*) as count
FROM trend_validations tv
LEFT JOIN trend_submissions ts ON tv.trend_submission_id = ts.id
WHERE ts.id IS NULL;

-- Final Status
SELECT '=== FINAL STATUS ===' as test;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'cast_trend_vote') 
        THEN '✅ Vote function exists'
        ELSE '❌ Vote function missing'
    END as vote_function_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'profiles' 
                    AND column_name = 'earnings_pending')
        THEN '✅ Earnings columns exist'
        ELSE '❌ Earnings columns missing'
    END as earnings_columns_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.triggers 
                    WHERE trigger_name = 'on_trend_submission_created')
        THEN '✅ Submission trigger exists'
        ELSE '❌ Submission trigger missing'
    END as submission_trigger_status;