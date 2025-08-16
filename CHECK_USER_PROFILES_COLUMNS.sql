-- Check the actual column names in user_profiles table
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if there's data in the table
SELECT * FROM user_profiles LIMIT 5;

-- Check what the primary key column is called
SELECT 
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'user_profiles' 
AND tc.constraint_type = 'PRIMARY KEY';