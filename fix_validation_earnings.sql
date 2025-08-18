-- Fix validation earnings - remove $0.10 entries and disable all triggers
-- Run this script in Supabase SQL Editor

BEGIN;

-- 1. DELETE all incorrect $0.10 validation earnings
DELETE FROM earnings_ledger 
WHERE type = 'validation' 
AND amount = 0.10;

-- 2. DROP all validation-related triggers to prevent automatic earnings
DROP TRIGGER IF EXISTS create_validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS validation_earnings_trigger ON trend_validations;
DROP TRIGGER IF EXISTS auto_validation_earnings ON trend_validations;
DROP TRIGGER IF EXISTS validation_reward_trigger ON trend_validations;

-- 3. DROP all validation-related functions
DROP FUNCTION IF EXISTS create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS auto_create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS create_validation_reward() CASCADE;

-- 4. Verify no validation triggers remain
SELECT 
    trigger_name, 
    event_object_table, 
    action_timing, 
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

COMMIT;

-- Verification: Check remaining validation earnings
SELECT 
    user_id,
    amount,
    type,
    status,
    created_at,
    trend_id
FROM earnings_ledger 
WHERE type = 'validation' 
ORDER BY created_at DESC 
LIMIT 20;