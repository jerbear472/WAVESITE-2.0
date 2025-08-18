-- FIX REMAINING EARNINGS ISSUES
-- This script ensures all approved trends have their earnings properly approved

BEGIN;

-- ============================================
-- DIAGNOSTIC: Check current state
-- ============================================

-- Check how many trends are approved vs pending
SELECT 
    'Trend Status Distribution' as report,
    status,
    COUNT(*) as count
FROM trend_submissions
GROUP BY status
ORDER BY status;

-- Check approved trends and their earnings
SELECT 
    'Approved Trends Missing Approved Earnings' as report,
    ts.id,
    ts.description,
    ts.status as trend_status,
    ts.approve_count,
    ts.spotter_id,
    el.status as earning_status,
    el.amount
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id AND el.type = 'trend_submission'
WHERE ts.status = 'approved'
AND (el.status != 'approved' OR el.status IS NULL);

-- ============================================
-- FIX 1: Approve all submission earnings for approved trends
-- ============================================

UPDATE earnings_ledger el
SET 
    status = 'approved',
    metadata = COALESCE(el.metadata, '{}'::jsonb) || 
              jsonb_build_object('auto_approved', true, 'approved_at', NOW())
FROM trend_submissions ts
WHERE el.reference_id = ts.id
AND el.type = 'trend_submission'
AND el.status = 'pending'
AND ts.status = 'approved';

-- ============================================
-- FIX 2: Approve all validation earnings for finalized trends
-- ============================================

UPDATE earnings_ledger el
SET 
    status = 'approved',
    metadata = COALESCE(el.metadata, '{}'::jsonb) || 
              jsonb_build_object('auto_approved', true, 'approved_at', NOW())
FROM trend_validations tv
JOIN trend_submissions ts ON tv.trend_id = ts.id
WHERE el.reference_id = tv.id
AND el.type = 'validation'
AND el.status = 'pending'
AND ts.status IN ('approved', 'rejected');

-- ============================================
-- FIX 3: Create missing approval bonuses
-- ============================================

-- Find approved trends without bonuses
WITH missing_bonuses AS (
    SELECT 
        ts.id as trend_id,
        ts.spotter_id,
        ts.description
    FROM trend_submissions ts
    WHERE ts.status = 'approved'
    AND ts.approve_count >= 3
    AND NOT EXISTS (
        SELECT 1 FROM earnings_ledger el
        WHERE el.reference_id = ts.id
        AND el.type = 'approval_bonus'
    )
)
INSERT INTO earnings_ledger (
    user_id,
    type,
    amount,
    status,
    reference_id,
    reference_type,
    description,
    metadata
)
SELECT 
    spotter_id,
    'approval_bonus',
    0.50,
    'approved',
    trend_id,
    'trend',
    format('Approval bonus for trend: %s', COALESCE(description, 'Untitled')),
    jsonb_build_object(
        'trend_id', trend_id,
        'retroactive', true,
        'created_at', NOW()
    )
FROM missing_bonuses;

-- ============================================
-- FIX 4: Recalculate user_profiles earnings
-- ============================================

-- Update user_profiles based on corrected earnings_ledger
WITH user_totals AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END) as total_earned
    FROM earnings_ledger
    GROUP BY user_id
)
UPDATE user_profiles up
SET 
    pending_earnings = ut.pending_total,
    approved_earnings = ut.approved_total,
    total_earned = ut.total_earned
FROM user_totals ut
WHERE up.id = ut.user_id;

-- ============================================
-- FIX 5: Update trend counts in user_profiles
-- ============================================

WITH trend_counts AS (
    SELECT 
        spotter_id as user_id,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
        COUNT(*) as total_submitted
    FROM trend_submissions
    WHERE spotter_id IS NOT NULL
    GROUP BY spotter_id
)
UPDATE user_profiles up
SET 
    trends_spotted = COALESCE(tc.approved_count, 0)
FROM trend_counts tc
WHERE up.id = tc.user_id;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Final summary
SELECT 
    'Final Earnings Summary' as report,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count
FROM earnings_ledger
GROUP BY type
ORDER BY type;

-- Check user totals
SELECT 
    'Top Earners' as report,
    up.username,
    up.pending_earnings,
    up.approved_earnings,
    up.total_earned,
    up.trends_spotted
FROM user_profiles up
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC
LIMIT 10;

-- Trends that should have bonuses
SELECT 
    'Trends With Complete Earnings' as report,
    ts.id,
    ts.status,
    ts.approve_count,
    COUNT(CASE WHEN el.type = 'trend_submission' THEN 1 END) as has_submission,
    COUNT(CASE WHEN el.type = 'approval_bonus' THEN 1 END) as has_bonus,
    SUM(CASE WHEN el.type = 'trend_submission' THEN el.amount ELSE 0 END) as submission_amount,
    SUM(CASE WHEN el.type = 'approval_bonus' THEN el.amount ELSE 0 END) as bonus_amount
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id
WHERE ts.status = 'approved'
GROUP BY ts.id, ts.status, ts.approve_count
ORDER BY ts.updated_at DESC
LIMIT 20;