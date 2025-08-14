-- Fix migration with correct table and column names
-- Run this to check what tables actually exist

-- Check all tables that might contain trends
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%trend%' 
ORDER BY table_name;

-- Check all tables with spotter_id column
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'spotter_id'
ORDER BY table_name;

-- Check all tables with user_id column  
SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND column_name = 'user_id'
ORDER BY table_name;

-- Check structure of trends table if it exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trends' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check structure of trend_submissions table if it exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;