-- Verify all validation triggers and functions are removed

-- Check for ANY triggers on trend_validations table
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

-- Check for ANY functions with 'validation' in the name
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%validation%' 
AND routine_type = 'FUNCTION';

-- Check if there are any recent $0.10 validation earnings (should be none)
SELECT 
    COUNT(*) as count_of_10_cent_earnings
FROM earnings_ledger 
WHERE type = 'validation' 
AND amount = 0.10
AND created_at > NOW() - INTERVAL '1 day';