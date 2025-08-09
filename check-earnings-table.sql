-- Check if earnings_ledger table exists and has data
SELECT 
    'Table exists' as check_type,
    EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'earnings_ledger'
    )::text as result;

-- Check columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- Check if there's any data
SELECT 
    COUNT(*) as total_records,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT trend_submission_id) as unique_trends
FROM earnings_ledger;

-- Check data by status
SELECT 
    status,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM earnings_ledger
GROUP BY status, type
ORDER BY status, type;