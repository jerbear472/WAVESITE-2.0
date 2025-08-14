-- Check the actual table structure to fix column name issues

-- Check captured_trends table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'captured_trends' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check trend_validations table structure  
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trend_validations' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check user_profiles table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;