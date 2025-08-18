-- CORRECTED FIX FOR VALIDATION EARNINGS
-- This script ensures validation earnings are exactly $0.02
-- Fixed to work with actual earnings_ledger table structure

BEGIN;

-- ============================================
-- STEP 1: REMOVE ALL AUTOMATIC TRIGGERS
-- ============================================

-- Drop all possible validation earnings triggers
DROP TRIGGER IF EXISTS create_validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS auto_validation_earnings ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS validation_reward_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS handle_new_validation ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS process_validation_earnings ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS auto_validation_reward ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS validation_earnings_auto ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS after_validation_insert ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS before_validation_insert ON trend_validations CASCADE;

-- Drop all possible validation earnings functions
DROP FUNCTION IF EXISTS create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS auto_create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS create_validation_reward() CASCADE;
DROP FUNCTION IF EXISTS process_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_new_validation() CASCADE;
DROP FUNCTION IF EXISTS auto_validation_reward() CASCADE;
DROP FUNCTION IF EXISTS validation_earnings_handler() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_insert() CASCADE;
DROP FUNCTION IF EXISTS after_validation_insert() CASCADE;

-- ============================================
-- STEP 2: FIX EXISTING INCORRECT EARNINGS
-- ============================================

-- Update all $0.10 validation earnings to $0.02
UPDATE earnings_ledger 
SET 
    amount = 0.02,
    metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{corrected}',
        'true'::jsonb
    )
WHERE type = 'validation' 
AND amount = 0.10;

-- Update any other incorrect validation amounts to $0.02
UPDATE earnings_ledger 
SET 
    amount = 0.02,
    metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{corrected}',
        'true'::jsonb
    )
WHERE type = 'validation' 
AND amount != 0.02;

-- ============================================
-- STEP 3: RECALCULATE USER BALANCES
-- ============================================

-- Update user profiles with corrected earnings totals
-- Note: removed updated_at since it doesn't exist in the table
WITH corrected_earnings AS (
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
    total_earned = COALESCE(ce.total_earned, 0),
    today_earned = COALESCE(ce.today_earned, 0)
FROM corrected_earnings ce
WHERE user_profiles.user_id = ce.user_id;

-- ============================================
-- STEP 4: VERIFICATION QUERIES
-- ============================================

-- Check for any remaining triggers on trend_validations
SELECT 
    'WARNING: Trigger still exists: ' || trigger_name || ' (' || action_timing || ' ' || event_manipulation || ')' as alert
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

-- Check for any validation-related functions
SELECT 
    'WARNING: Function still exists: ' || routine_name as alert
FROM information_schema.routines 
WHERE routine_name LIKE '%validation%' 
AND routine_type = 'FUNCTION'
AND routine_name NOT IN ('validate_email', 'validate_username', 'validate_json'); -- Exclude unrelated validation functions

-- Show recent validation earnings (should all be $0.02)
SELECT 
    'Recent Validation Earnings:' as report_type,
    COUNT(*) as count,
    amount,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM earnings_ledger 
WHERE type = 'validation'
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY amount
ORDER BY amount DESC;

-- Show affected users
SELECT 
    'Users with corrected earnings:' as report_type,
    COUNT(DISTINCT user_id) as affected_users,
    SUM(CASE WHEN amount = 0.02 THEN 1 ELSE 0 END) as correct_earnings,
    SUM(CASE WHEN amount != 0.02 THEN 1 ELSE 0 END) as incorrect_earnings
FROM earnings_ledger 
WHERE type = 'validation';

-- Show count of corrected entries
SELECT 
    'Corrected Entries:' as report_type,
    COUNT(*) as total_corrected
FROM earnings_ledger 
WHERE type = 'validation' 
AND metadata->>'corrected' = 'true';

COMMIT;

-- ============================================
-- FINAL SUMMARY
-- ============================================

-- Display summary of changes
SELECT 
    'VALIDATION EARNINGS FIXED' as status,
    'All validation earnings should now be $0.02' as message,
    COUNT(*) as total_validations,
    SUM(amount) as total_validation_earnings,
    ROUND(AVG(amount)::numeric, 2) as average_per_validation
FROM earnings_ledger 
WHERE type = 'validation';

-- Show any remaining incorrect amounts
SELECT 
    'Remaining Incorrect Amounts:' as issue,
    amount,
    COUNT(*) as count
FROM earnings_ledger 
WHERE type = 'validation'
AND amount != 0.02
GROUP BY amount
ORDER BY count DESC;