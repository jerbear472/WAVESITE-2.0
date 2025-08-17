-- Check if earnings_ledger table exists and its columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'earnings_ledger'
ORDER BY 
    ordinal_position;
