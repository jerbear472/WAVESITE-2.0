-- ============================================
-- COMPREHENSIVE BUG CHECK FOR VALIDATION SYSTEM
-- ============================================

-- 1. CHECK ACTIVE TRIGGERS
-- ============================================
SELECT 
    'Active Triggers' as check_type,
    trigger_name,
    event_object_table,
    action_statement,
    action_timing || ' ' || array_to_string(array_agg(event_manipulation), ', ') as when_fires
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
    'update_trend_counts_on_validation',
    'on_trend_validation_create',
    'handle_trend_approval_trigger',
    'approve_validation_earnings_trigger',
    'update_user_profile_on_earnings_change',
    'on_trend_submission_create'
)
GROUP BY trigger_name, event_object_table, action_statement, action_timing
ORDER BY event_object_table, trigger_name;

-- 2. CHECK VALIDATION_STATUS FIELD TYPE
-- ============================================
SELECT 
    'Column Data Types' as check_type,
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'trend_submissions'
AND column_name IN ('status', 'validation_status', 'approve_count', 'reject_count')
ORDER BY ordinal_position;

-- 3. CHECK ENUM VALUES
-- ============================================
SELECT 
    'Enum Types and Values' as check_type,
    t.typname as enum_name,
    string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as valid_values
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('trend_status', 'earning_status', 'earnings_type')
GROUP BY t.typname;

-- 4. CHECK FOR DUPLICATE VALIDATION EARNINGS
-- ============================================
WITH duplicate_validations AS (
    SELECT 
        reference_id,
        COUNT(*) as count
    FROM earnings_ledger
    WHERE type = 'validation'
    GROUP BY reference_id
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate Validation Earnings' as check_type,
    COUNT(*) as duplicate_count,
    SUM(count - 1) as extra_records
FROM duplicate_validations;

-- 5. CHECK FOR MISSING VALIDATION EARNINGS
-- ============================================
SELECT 
    'Missing Validation Earnings' as check_type,
    COUNT(*) as missing_count
FROM trend_validations tv
WHERE NOT EXISTS (
    SELECT 1 FROM earnings_ledger el
    WHERE el.reference_id = tv.id
    AND el.type IN ('validation', 'trend_validation')
);

-- 6. CHECK FOR DUPLICATE SUBMISSION EARNINGS
-- ============================================
WITH duplicate_submissions AS (
    SELECT 
        reference_id,
        COUNT(*) as count
    FROM earnings_ledger
    WHERE type = 'trend_submission'
    GROUP BY reference_id
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate Submission Earnings' as check_type,
    COUNT(*) as duplicate_count,
    SUM(count - 1) as extra_records
FROM duplicate_submissions;

-- 7. CHECK FOR MISSING SUBMISSION EARNINGS
-- ============================================
SELECT 
    'Missing Submission Earnings' as check_type,
    COUNT(*) as missing_count
FROM trend_submissions ts
WHERE spotter_id IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM earnings_ledger el
    WHERE el.reference_id = ts.id
    AND el.type = 'trend_submission'
);

-- 8. CHECK VOTE COUNT ACCURACY
-- ============================================
WITH actual_votes AS (
    SELECT 
        trend_id,
        COUNT(CASE WHEN vote IN ('verify', 'approve') THEN 1 END) as actual_approves,
        COUNT(CASE WHEN vote = 'reject' THEN 1 END) as actual_rejects
    FROM trend_validations
    GROUP BY trend_id
)
SELECT 
    'Vote Count Mismatches' as check_type,
    COUNT(*) as mismatch_count
FROM trend_submissions ts
JOIN actual_votes av ON ts.id = av.trend_id
WHERE ts.approve_count != av.actual_approves
   OR ts.reject_count != av.actual_rejects;

-- 9. CHECK APPROVAL THRESHOLD VIOLATIONS
-- ============================================
SELECT 
    'Threshold Violations' as check_type,
    COUNT(CASE WHEN status = 'approved' AND approve_count < 3 THEN 1 END) as approved_too_early,
    COUNT(CASE WHEN status = 'rejected' AND reject_count < 3 THEN 1 END) as rejected_too_early,
    COUNT(CASE WHEN status NOT IN ('approved', 'rejected') AND approve_count >= 3 THEN 1 END) as should_be_approved,
    COUNT(CASE WHEN status NOT IN ('approved', 'rejected') AND reject_count >= 3 THEN 1 END) as should_be_rejected
FROM trend_submissions;

-- 10. CHECK APPROVAL BONUS CONSISTENCY
-- ============================================
SELECT 
    'Approval Bonus Issues' as check_type,
    COUNT(CASE WHEN ts.status = 'approved' AND el.id IS NULL THEN 1 END) as missing_bonuses,
    COUNT(CASE WHEN ts.status != 'approved' AND el.id IS NOT NULL THEN 1 END) as incorrect_bonuses,
    COUNT(CASE WHEN el.amount != 0.50 THEN 1 END) as wrong_amount
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id AND el.type = 'approval_bonus'
WHERE ts.status = 'approved' OR el.id IS NOT NULL;

-- 11. CHECK EARNINGS STATUS TRANSITIONS
-- ============================================
SELECT 
    'Earnings Status Issues' as check_type,
    COUNT(CASE WHEN ts.status = 'approved' AND el.status != 'approved' THEN 1 END) as should_be_approved,
    COUNT(CASE WHEN ts.status = 'rejected' AND el.status != 'cancelled' THEN 1 END) as should_be_cancelled,  -- earning_status uses 'cancelled' not 'rejected'
    COUNT(CASE WHEN ts.status IN ('submitted', 'validating') AND el.status != 'pending' THEN 1 END) as should_be_pending
FROM trend_submissions ts
JOIN earnings_ledger el ON el.reference_id = ts.id AND el.type = 'trend_submission';

-- 12. CHECK VALIDATION EARNINGS AMOUNTS
-- ============================================
SELECT 
    'Validation Earnings Amounts' as check_type,
    amount,
    COUNT(*) as count,
    CASE 
        WHEN amount = 0.02 THEN 'CORRECT'
        WHEN amount = 0.10 THEN 'OLD BUG - Should be $0.02'
        WHEN amount = 0.01 THEN 'WRONG - Should be $0.02'
        ELSE 'UNKNOWN'
    END as status
FROM earnings_ledger
WHERE type IN ('validation', 'trend_validation')
GROUP BY amount
ORDER BY count DESC;

-- 13. CHECK USER PROFILE TOTALS
-- ============================================
WITH calculated_totals AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as calc_pending,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as calc_approved,
        SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END) as calc_total
    FROM earnings_ledger
    GROUP BY user_id
)
SELECT 
    'User Profile Discrepancies' as check_type,
    COUNT(CASE WHEN ABS(up.pending_earnings - ct.calc_pending) > 0.01 THEN 1 END) as pending_mismatch,
    COUNT(CASE WHEN ABS(up.approved_earnings - ct.calc_approved) > 0.01 THEN 1 END) as approved_mismatch,
    COUNT(CASE WHEN ABS(up.total_earned - ct.calc_total) > 0.01 THEN 1 END) as total_mismatch
FROM user_profiles up
JOIN calculated_totals ct ON up.id = ct.user_id;

-- 14. CHECK FOR RACE CONDITIONS
-- ============================================
WITH rapid_validations AS (
    SELECT 
        trend_id,
        COUNT(*) as vote_count,
        MAX(created_at) - MIN(created_at) as time_span
    FROM trend_validations
    GROUP BY trend_id
    HAVING COUNT(*) >= 3
)
SELECT 
    'Potential Race Conditions' as check_type,
    COUNT(CASE WHEN time_span < INTERVAL '1 second' THEN 1 END) as very_rapid_votes,
    COUNT(CASE WHEN time_span < INTERVAL '10 seconds' THEN 1 END) as rapid_votes,
    COUNT(*) as total_completed_trends
FROM rapid_validations;

-- 15. CHECK VALIDATION_STATUS VS STATUS CONSISTENCY
-- ============================================
SELECT 
    'Status Field Inconsistencies' as check_type,
    status,
    validation_status,
    COUNT(*) as count
FROM trend_submissions
WHERE (status = 'approved' AND validation_status != 'approved')
   OR (status = 'rejected' AND validation_status != 'cancelled')  -- earning_status uses 'cancelled' not 'rejected'
   OR (status IN ('submitted', 'validating') AND validation_status != 'pending')
GROUP BY status, validation_status;

-- 16. SUMMARY REPORT
-- ============================================
SELECT 
    'SYSTEM HEALTH SUMMARY' as report,
    (SELECT COUNT(*) FROM trend_submissions) as total_trends,
    (SELECT COUNT(*) FROM trend_submissions WHERE status = 'approved') as approved_trends,
    (SELECT COUNT(*) FROM trend_validations) as total_validations,
    (SELECT COUNT(*) FROM earnings_ledger) as total_earnings,
    (SELECT SUM(amount) FROM earnings_ledger WHERE status = 'pending') as pending_amount,
    (SELECT SUM(amount) FROM earnings_ledger WHERE status = 'approved') as approved_amount;