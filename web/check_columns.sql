-- Check what columns exist in trend_submissions table
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;
