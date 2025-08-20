-- Check what tables exist in your database
-- Run this first to see the actual table names

SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name LIKE '%valid%' 
    OR table_name LIKE '%trend%' 
    OR table_name LIKE '%vote%'
    OR table_name LIKE '%submission%'
    OR table_name LIKE '%profile%'
    OR table_name LIKE '%user%'
)
ORDER BY table_name;