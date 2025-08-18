-- COMPLETE VALIDATION EARNINGS FIX
-- This will completely stop the $0.10 validation earnings from being created automatically

BEGIN;

-- 1. DELETE ALL existing $0.10 validation earnings
DELETE FROM earnings_ledger 
WHERE type = 'validation' 
AND amount = 0.10;

-- 2. DELETE ALL validation earnings that are not exactly $0.02
DELETE FROM earnings_ledger 
WHERE type = 'validation' 
AND amount != 0.02;

-- 3. DROP ALL possible validation triggers (comprehensive list)
DROP TRIGGER IF EXISTS create_validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS auto_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS validation_reward_trigger ON trend_validations;
DROP TRIGGER IF EXISTS handle_new_validation ON trend_validations;
DROP TRIGGER IF EXISTS process_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS auto_validation_reward ON trend_validations;
DROP TRIGGER IF EXISTS validation_earnings_auto ON trend_validations;

-- 4. DROP ALL possible validation functions (comprehensive list)
DROP FUNCTION IF EXISTS create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS auto_create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS create_validation_reward() CASCADE;
DROP FUNCTION IF EXISTS process_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_new_validation() CASCADE;
DROP FUNCTION IF EXISTS auto_validation_reward() CASCADE;
DROP FUNCTION IF EXISTS validation_earnings_handler() CASCADE;

-- 5. Check for ANY remaining triggers on trend_validations table
SELECT 
    'TRIGGER FOUND: ' || trigger_name || ' - ' || action_timing || ' ' || event_manipulation as alert
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

-- 6. Check for ANY validation-related functions
SELECT 
    'FUNCTION FOUND: ' || routine_name as alert
FROM information_schema.routines 
WHERE routine_name LIKE '%validation%' 
AND routine_type = 'FUNCTION';

COMMIT;

-- Final verification
SELECT 
    'RECENT VALIDATION EARNINGS:' as check_type,
    user_id,
    amount,
    type,
    status,
    created_at
FROM earnings_ledger 
WHERE type = 'validation' 
ORDER BY created_at DESC 
LIMIT 10;