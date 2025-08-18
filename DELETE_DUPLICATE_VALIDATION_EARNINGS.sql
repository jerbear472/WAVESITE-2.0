-- DELETE DUPLICATE VALIDATION EARNINGS
-- This script removes the incorrect $0.10 validation earnings
-- and ensures only $0.02 entries remain

BEGIN;

-- ============================================
-- STEP 1: IDENTIFY AND DELETE DUPLICATES
-- ============================================

-- First, let's see what we're dealing with
SELECT 
    'BEFORE CLEANUP - Duplicate validation earnings:' as status,
    user_id,
    trend_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(amount::text, ', ') as amounts,
    STRING_AGG(id::text, ', ') as entry_ids
FROM earnings_ledger
WHERE type = 'validation'
AND trend_id IS NOT NULL
GROUP BY user_id, trend_id
HAVING COUNT(*) > 1;

-- Delete all $0.10 validation entries when a $0.02 entry exists for the same validation
DELETE FROM earnings_ledger
WHERE id IN (
    SELECT e1.id
    FROM earnings_ledger e1
    WHERE e1.type = 'validation'
    AND e1.amount = 0.10
    AND EXISTS (
        SELECT 1 
        FROM earnings_ledger e2
        WHERE e2.type = 'validation'
        AND e2.amount = 0.02
        AND e2.user_id = e1.user_id
        AND e2.trend_id = e1.trend_id
        AND e2.id != e1.id
    )
);

-- Delete ALL $0.10 validation entries (even without duplicates)
DELETE FROM earnings_ledger
WHERE type = 'validation'
AND amount = 0.10;

-- ============================================
-- STEP 2: AGGRESSIVELY REMOVE ALL TRIGGERS
-- ============================================

-- Drop every possible trigger on trend_validations table
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'trend_validations'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_validations CASCADE', trigger_rec.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.trigger_name;
    END LOOP;
END $$;

-- Drop all validation-related functions
DO $$
DECLARE
    func_rec RECORD;
BEGIN
    FOR func_rec IN 
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_name LIKE '%validation%earnings%'
        AND routine_type = 'FUNCTION'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I() CASCADE', func_rec.routine_name);
        RAISE NOTICE 'Dropped function: %', func_rec.routine_name;
    END LOOP;
END $$;

-- ============================================
-- STEP 3: RECALCULATE USER BALANCES
-- ============================================

-- Update user profiles with corrected totals
WITH corrected_totals AS (
    SELECT 
        user_id,
        SUM(amount) as total_earned,
        SUM(CASE 
            WHEN DATE(created_at) = CURRENT_DATE 
            THEN amount 
            ELSE 0 
        END) as today_earned
    FROM earnings_ledger
    WHERE status IN ('approved', 'pending')
    GROUP BY user_id
)
UPDATE user_profiles
SET 
    total_earned = COALESCE(ct.total_earned, 0),
    today_earned = COALESCE(ct.today_earned, 0)
FROM corrected_totals ct
WHERE user_profiles.user_id = ct.user_id;

-- ============================================
-- STEP 4: VERIFICATION
-- ============================================

-- Check for any remaining duplicates
SELECT 
    'AFTER CLEANUP - Remaining duplicates:' as status,
    user_id,
    trend_id,
    COUNT(*) as duplicate_count,
    STRING_AGG(amount::text, ', ') as amounts
FROM earnings_ledger
WHERE type = 'validation'
AND trend_id IS NOT NULL
GROUP BY user_id, trend_id
HAVING COUNT(*) > 1;

-- Show validation earnings summary
SELECT 
    'Validation Earnings Summary:' as report,
    amount,
    COUNT(*) as count,
    SUM(amount) as total
FROM earnings_ledger
WHERE type = 'validation'
GROUP BY amount
ORDER BY amount;

-- Check for any remaining triggers
SELECT 
    COUNT(*) as remaining_triggers,
    STRING_AGG(trigger_name, ', ') as trigger_names
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

-- Show recent validations to confirm only $0.02
SELECT 
    'Recent Validation Earnings (last 10):' as report,
    user_id,
    trend_id,
    amount,
    created_at,
    metadata->>'corrected' as was_corrected
FROM earnings_ledger
WHERE type = 'validation'
ORDER BY created_at DESC
LIMIT 10;

COMMIT;

-- ============================================
-- FINAL STATUS
-- ============================================

SELECT 
    'CLEANUP COMPLETE' as status,
    COUNT(*) as total_validation_earnings,
    COUNT(CASE WHEN amount = 0.02 THEN 1 END) as correct_count,
    COUNT(CASE WHEN amount != 0.02 THEN 1 END) as incorrect_count,
    SUM(amount) as total_validation_payouts
FROM earnings_ledger
WHERE type = 'validation';