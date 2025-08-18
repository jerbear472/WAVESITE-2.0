-- Find ALL sources of validation earnings

-- 1. Show ALL triggers on trend_validations table
SELECT 
    'TRIGGER ON TREND_VALIDATIONS' as source_type,
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'trend_validations';

-- 2. Show ALL triggers that might create earnings
SELECT 
    'TRIGGER CREATING EARNINGS' as source_type,
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation
FROM information_schema.triggers 
WHERE action_statement LIKE '%earnings%'
OR action_statement LIKE '%0.10%'
OR action_statement LIKE '%0.02%';

-- 3. Show ALL functions that might create earnings
SELECT 
    'FUNCTION WITH EARNINGS' as source_type,
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_type = 'FUNCTION'
AND (routine_definition LIKE '%earnings_ledger%'
OR routine_definition LIKE '%0.10%'
OR routine_definition LIKE '%validation%');

-- 4. Show recent validation earnings with exact amounts
SELECT 
    'RECENT VALIDATION' as check_type,
    id,
    user_id,
    amount,
    type,
    status,
    created_at,
    trend_id,
    metadata
FROM earnings_ledger 
WHERE type = 'validation' 
AND created_at > NOW() - INTERVAL '1 hour'
ORDER BY created_at DESC;

-- 5. Check for duplicate validation earnings (same user, same trend, within seconds)
SELECT 
    'DUPLICATE CHECK' as check_type,
    user_id,
    trend_id,
    COUNT(*) as entry_count,
    STRING_AGG(amount::text, ', ') as amounts,
    STRING_AGG(created_at::text, ', ') as created_times
FROM earnings_ledger 
WHERE type = 'validation' 
AND created_at > NOW() - INTERVAL '1 day'
GROUP BY user_id, trend_id
HAVING COUNT(*) > 1
ORDER BY MAX(created_at) DESC;