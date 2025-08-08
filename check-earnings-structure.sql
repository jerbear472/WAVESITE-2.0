-- Check the structure of earnings_ledger table

-- 1. Check if the table exists
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'earnings_ledger'
) as earnings_ledger_exists;

-- 2. Show all columns if it exists
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- 3. Check for trend-related columns
SELECT 
    column_name,
    CASE 
        WHEN column_name = 'trend_submission_id' THEN '✅ Correct name'
        WHEN column_name = 'trend_id' THEN '⚠️  Should be trend_submission_id'
        ELSE '❌ Missing'
    END as status
FROM (
    SELECT 'trend_submission_id' as column_name
    UNION ALL
    SELECT 'trend_id'
) expected
LEFT JOIN information_schema.columns actual
    ON actual.column_name = expected.column_name
    AND actual.table_schema = 'public' 
    AND actual.table_name = 'earnings_ledger';

-- 4. Show any foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'earnings_ledger'
    AND tc.table_schema = 'public';