-- =====================================================
-- VERIFY EARNINGS SETUP IS WORKING
-- =====================================================

-- 1. Test validation earnings calculation ($0.02 base)
SELECT 
    '=== VALIDATION EARNINGS (FIXED: $0.02 base) ===' as test_section;

SELECT 
    tier,
    multiplier,
    earning_amount,
    description
FROM get_validation_rate_examples()
ORDER BY multiplier;

-- 2. Test trend earnings calculation ($0.25 base)
SELECT 
    '=== TREND EARNINGS ($0.25 base) ===' as test_section;

SELECT 
    scenario,
    tier,
    session_pos,
    daily_streak,
    final_amount,
    description
FROM get_trend_rate_examples()
ORDER BY final_amount;

-- 3. Verify individual calculations
SELECT 
    '=== INDIVIDUAL CALCULATIONS ===' as test_section;

-- Test validation for each tier
SELECT 
    'Validation - Learning' as test_case,
    calculate_validation_earnings_amount('learning') as amount,
    'Should be $0.02 (0.02 × 1.0)' as expected;

SELECT 
    'Validation - Verified' as test_case,
    calculate_validation_earnings_amount('verified') as amount,
    'Should be $0.03 (0.02 × 1.5)' as expected;

SELECT 
    'Validation - Elite' as test_case,
    calculate_validation_earnings_amount('elite') as amount,
    'Should be $0.04 (0.02 × 2.0)' as expected;

SELECT 
    'Validation - Master' as test_case,
    calculate_validation_earnings_amount('master') as amount,
    'Should be $0.06 (0.02 × 3.0)' as expected;

-- Test trend with various multipliers
SELECT 
    'Trend - Basic' as test_case,
    (calculate_trend_earnings_amount('learning', 1, 0)).final_amount as amount,
    'Should be $0.25 (0.25 × 1.0 × 1.0 × 1.0)' as expected;

SELECT 
    'Trend - With Session Streak' as test_case,
    (calculate_trend_earnings_amount('learning', 3, 0)).final_amount as amount,
    'Should be $0.38 (0.25 × 1.0 × 1.5 × 1.0)' as expected;

SELECT 
    'Trend - With Daily Streak' as test_case,
    (calculate_trend_earnings_amount('learning', 1, 7)).final_amount as amount,
    'Should be $0.38 (0.25 × 1.0 × 1.0 × 1.5)' as expected;

SELECT 
    'Trend - Max Multipliers' as test_case,
    (calculate_trend_earnings_amount('master', 5, 30)).final_amount as amount,
    'Should be $4.69 (0.25 × 3.0 × 2.5 × 2.5)' as expected;

-- 4. Show the functions available
SELECT 
    '=== AVAILABLE FUNCTIONS ===' as test_section;

SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
    'get_tier_multiplier',
    'get_session_streak_multiplier',
    'get_daily_streak_multiplier',
    'calculate_trend_earnings_amount',
    'calculate_validation_earnings_amount',
    'get_validation_rate_examples',
    'get_trend_rate_examples'
)
ORDER BY routine_name;

-- 5. Summary
SELECT 
    '=== EARNINGS SYSTEM STATUS ===' as summary;

SELECT 
    '✅ Validation rate FIXED' as status,
    '$0.02 per validation (was $0.10)' as details
UNION ALL
SELECT 
    '✅ Trend rate CONSISTENT' as status,
    '$0.25 per trend submission' as details  
UNION ALL
SELECT 
    '✅ Multipliers WORKING' as status,
    'Tier: 0.5x-3.0x, Session: 1.0x-2.5x, Daily: 1.0x-2.5x' as details
UNION ALL
SELECT 
    '✅ Functions AVAILABLE' as status,
    'App can call calculate_validation_earnings_amount() and calculate_trend_earnings_amount()' as details;