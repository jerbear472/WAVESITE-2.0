-- Diagnostic script to check why trend submission isn't working
-- Run this AFTER running fix-submit-trend-foreign-key.sql

-- 1. Check if trend_submissions table exists and has required columns
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- 2. Check if profiles table exists and has users
SELECT COUNT(*) as user_count FROM public.profiles;

-- 3. Check a sample user
SELECT id, email, username, created_at 
FROM public.profiles 
LIMIT 3;

-- 4. Check RLS policies on trend_submissions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- 5. Check foreign key constraints
SELECT
    tc.table_schema, 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_schema AS foreign_table_schema,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'trend_submissions';

-- 6. Test insert permissions (this will fail but show us the error)
-- Replace 'YOUR_USER_ID' with an actual user ID from step 3
/*
INSERT INTO public.trend_submissions (
    spotter_id,
    category,
    description,
    evidence,
    status,
    quality_score
) VALUES (
    'YOUR_USER_ID_HERE',
    'meme_format',
    'Test trend submission',
    '{"url": "https://example.com", "platform": "tiktok"}',
    'submitted',
    0.5
);
*/

-- 7. Check if storage bucket exists for images
SELECT name, id, public 
FROM storage.buckets 
WHERE name = 'trend-images';

SELECT 'Diagnostic complete! Check the results above to identify issues.' as status;