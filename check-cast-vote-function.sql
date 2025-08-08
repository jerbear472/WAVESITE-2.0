-- Check if the function exists and its current definition
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'cast_trend_vote';

-- Check the trend_validations table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_validations'
ORDER BY ordinal_position;

-- Check the earnings_ledger table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- Check if there are any recent votes
SELECT 
    id,
    trend_submission_id,
    validator_id,
    vote,
    created_at
FROM trend_validations
ORDER BY created_at DESC
LIMIT 5;

-- Check for any errors in recent earnings_ledger entries
SELECT 
    id,
    user_id,
    trend_submission_id,
    amount,
    transaction_type,
    created_at
FROM earnings_ledger
WHERE transaction_type = 'validation_reward'
ORDER BY created_at DESC
LIMIT 5;