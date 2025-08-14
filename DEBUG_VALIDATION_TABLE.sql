-- Debug: Check exact structure of trend_validations table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test insert to see what works
-- Try a minimal insert with only required fields
-- Run this manually with your actual IDs to test