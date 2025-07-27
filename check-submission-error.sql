-- Quick diagnostic to check trend submission setup

-- 1. Check if table exists and show structure
SELECT 
    'Table Structure' as check_type,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
ORDER BY ordinal_position;

-- 2. Check existing RLS policies
SELECT 
    'RLS Policies' as check_type,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- 3. Check if current user has a profile
SELECT 
    'User Profile' as check_type,
    id,
    email,
    username,
    created_at
FROM profiles 
WHERE id = auth.uid();

-- 4. Test if user can insert (dry run)
SELECT 
    'Insert Permission Test' as check_type,
    CASE 
        WHEN auth.uid() IS NULL THEN 'ERROR: Not authenticated'
        WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN 'ERROR: No profile found'
        ELSE 'OK: User can attempt insert'
    END as result;

-- 5. Check foreign key relationships
SELECT
    'Foreign Keys' as check_type,
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name='trend_submissions';

-- 6. Check if trend_umbrellas table exists (might be required)
SELECT 
    'Related Tables' as check_type,
    table_name,
    CASE 
        WHEN table_name = 'trend_umbrellas' THEN 'Found'
        ELSE 'Not Found'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('trend_umbrellas', 'profiles', 'users');