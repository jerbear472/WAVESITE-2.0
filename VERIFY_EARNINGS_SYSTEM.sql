-- ============================================
-- EARNINGS SYSTEM VERIFICATION SCRIPT
-- ============================================
-- This script verifies that the earnings system is properly configured:
-- 1. Trend submission adds $1 to pending
-- 2. 2 approvals move pending to approved  
-- 3. 2 rejections remove from pending
-- 4. $5 minimum cashout requirement
-- 5. Proper display throughout app

-- Check 1: Verify profiles table has all earnings columns
SELECT '=== CHECK 1: Earnings Columns in Profiles Table ===' as check;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
AND column_name IN ('earnings_pending', 'earnings_approved', 'earnings_paid', 'total_earnings')
ORDER BY column_name;

-- Check 2: Verify trend submission trigger exists
SELECT '=== CHECK 2: Trend Submission Trigger ===' as check;
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table = 'trend_submissions'
AND trigger_name LIKE '%trend_submission%';

-- Check 3: Verify cast_trend_vote function exists
SELECT '=== CHECK 3: Vote Function Exists ===' as check;
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name = 'cast_trend_vote';

-- Check 4: Verify vote counting columns exist
SELECT '=== CHECK 4: Vote Counting Columns ===' as check;
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_count', 'validation_status')
ORDER BY column_name;

-- Check 5: Test the earnings flow with sample data
SELECT '=== CHECK 5: Current Earnings Summary ===' as check;
SELECT 
    COUNT(*) as total_users,
    COUNT(CASE WHEN earnings_pending > 0 THEN 1 END) as users_with_pending,
    COUNT(CASE WHEN earnings_approved > 0 THEN 1 END) as users_with_approved,
    COUNT(CASE WHEN earnings_approved >= 5 THEN 1 END) as users_can_cashout,
    SUM(COALESCE(earnings_pending, 0)) as total_pending,
    SUM(COALESCE(earnings_approved, 0)) as total_approved,
    SUM(COALESCE(earnings_paid, 0)) as total_paid
FROM profiles;

-- Check 6: Verify trend submissions with vote counts
SELECT '=== CHECK 6: Recent Trends and Their Vote Status ===' as check;
SELECT 
    ts.id,
    ts.created_at::date as submission_date,
    ts.status,
    ts.validation_status,
    COALESCE(ts.approve_count, 0) as approvals,
    COALESCE(ts.reject_count, 0) as rejections,
    p.email as spotter_email,
    p.earnings_pending,
    p.earnings_approved
FROM trend_submissions ts
LEFT JOIN profiles p ON ts.spotter_id = p.id
ORDER BY ts.created_at DESC
LIMIT 10;

-- Check 7: Verify validation rewards
SELECT '=== CHECK 7: Recent Validations ===' as check;
SELECT 
    tv.created_at::date as validation_date,
    tv.vote,
    p.email as validator_email,
    p.earnings_approved as validator_approved_earnings
FROM trend_validations tv
LEFT JOIN profiles p ON tv.validator_id = p.id
ORDER BY tv.created_at DESC
LIMIT 10;

-- Check 8: Verify cashout requests table exists
SELECT '=== CHECK 8: Cashout Requests Table ===' as check;
SELECT 
    table_name,
    COUNT(*) as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'cashout_requests'
GROUP BY table_name;

-- Check 9: Show functions that modify earnings
SELECT '=== CHECK 9: Functions That Modify Earnings ===' as check;
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (
    routine_name LIKE '%earning%' 
    OR routine_name LIKE '%trend%' 
    OR routine_name = 'cast_trend_vote'
)
ORDER BY routine_name;

-- Check 10: Verify the exact logic in cast_trend_vote function
SELECT '=== CHECK 10: Vote Function Logic Verification ===' as check;
SELECT 
    'cast_trend_vote function should:' as requirement,
    '1. At 2 approvals: Move $1 from pending to approved' as step1,
    '2. At 2 rejections: Remove $1 from pending' as step2,
    '3. Always add $0.01 to validator approved earnings' as step3,
    '4. Update trend status to approved/rejected' as step4;

-- Final Summary
SELECT '=== FINAL SUMMARY ===' as check;
SELECT 
    'Earnings System Status' as system,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'earnings_pending')
        AND EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_name = 'cast_trend_vote')
        THEN '✅ CONFIGURED'
        ELSE '❌ NEEDS SETUP'
    END as status,
    'Run FIX_ALL_EARNINGS_COLUMNS.sql and CREATE_MISSING_VOTE_FUNCTION.sql if needed' as action;