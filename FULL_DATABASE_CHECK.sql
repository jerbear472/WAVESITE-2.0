-- ============================================
-- COMPREHENSIVE DATABASE STATUS CHECK
-- Run this entire script to see what exists
-- ============================================

-- Check 1: Tables
SELECT 
    'TABLES' as category,
    table_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    SELECT 'user_profiles' as expected_table
    UNION SELECT 'trend_submissions'
    UNION SELECT 'trend_validations'
    UNION SELECT 'earnings_ledger'
) expected
LEFT JOIN information_schema.tables actual 
    ON actual.table_name = expected.expected_table
ORDER BY expected_table;

-- Check 2: Views
SELECT 
    'VIEWS' as category,
    table_name as view_name,
    CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    SELECT 'profiles' as expected_view
) expected
LEFT JOIN information_schema.views actual 
    ON actual.table_name = expected.expected_view;

-- Check 3: Functions
SELECT 
    'FUNCTIONS' as category,
    proname as function_name,
    CASE WHEN proname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM (
    SELECT 'cast_trend_vote' as expected_function
) expected
LEFT JOIN pg_proc actual 
    ON actual.proname = expected.expected_function
WHERE actual.proname IS NULL OR actual.proname = 'cast_trend_vote';

-- Check 4: User Profiles Columns
SELECT 
    'USER_PROFILES_COLUMNS' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
AND column_name IN (
    'earnings_pending', 'earnings_approved', 'earnings_paid', 
    'total_earnings', 'daily_earnings', 'spotter_tier',
    'trends_spotted', 'accuracy_score', 'validation_score'
)
ORDER BY column_name;

-- Check 5: Trend Submissions Columns
SELECT 
    'TREND_SUBMISSIONS_COLUMNS' as category,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name IN (
    'base_amount', 'bonus_amount', 'total_earned',
    'validation_count', 'approve_count', 'reject_count',
    'earning_status', 'tier_multiplier'
)
ORDER BY column_name;

-- Check 6: Data Types
SELECT 
    'CUSTOM_TYPES' as category,
    typname as type_name,
    CASE WHEN typname IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
FROM pg_type
WHERE typname IN ('user_role', 'trend_status', 'spotter_tier', 'earning_status', 'trend_category');

-- Check 7: Row Counts
SELECT 
    'ROW_COUNTS' as category,
    'user_profiles' as table_name,
    COUNT(*) as count
FROM user_profiles
UNION ALL
SELECT 
    'ROW_COUNTS',
    'trend_submissions',
    COUNT(*)
FROM trend_submissions
UNION ALL
SELECT 
    'ROW_COUNTS',
    'trend_validations',
    COUNT(*)
FROM trend_validations;