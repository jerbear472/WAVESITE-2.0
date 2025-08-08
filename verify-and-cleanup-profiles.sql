-- Check if user_profiles is a table or a view
SELECT 
    'user_profiles' as name,
    CASE 
        WHEN t.table_type = 'VIEW' THEN 'VIEW'
        WHEN t.table_type = 'BASE TABLE' THEN 'TABLE'
        ELSE t.table_type
    END as type,
    t.table_type as full_type
FROM information_schema.tables t
WHERE t.table_name = 'user_profiles'
AND t.table_schema = 'public'

UNION ALL

SELECT 
    'profiles' as name,
    CASE 
        WHEN t.table_type = 'VIEW' THEN 'VIEW'
        WHEN t.table_type = 'BASE TABLE' THEN 'TABLE'
        ELSE t.table_type
    END as type,
    t.table_type as full_type
FROM information_schema.tables t
WHERE t.table_name = 'profiles'
AND t.table_schema = 'public';

-- If user_profiles is a view, we can safely drop it
-- Run this only after confirming it's a view:
-- DROP VIEW IF EXISTS user_profiles CASCADE;