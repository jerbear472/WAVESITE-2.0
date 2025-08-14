-- Check EXACT columns in trend_validations table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also check if there's a user_profiles table
SELECT 
    column_name, 
    data_type
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check all tables in the database
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;