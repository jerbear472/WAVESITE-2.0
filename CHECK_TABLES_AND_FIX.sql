-- First, let's check what tables actually exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Check if it's profiles or user_profiles
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_profiles'
) as user_profiles_exists,
EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) as profiles_exists;

-- Check columns in the profiles/user_profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles')
ORDER BY ordinal_position;