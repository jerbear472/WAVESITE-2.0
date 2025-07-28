-- Check the exact schema of trend_submissions table

-- 1. Check column details including defaults
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- 2. Check all constraints on the table
SELECT 
    con.conname as constraint_name,
    con.contype as constraint_type,
    pg_get_constraintdef(con.oid) as definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'trend_submissions';

-- 3. Check if there are any triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trend_submissions';

-- 4. Check the exact enum values for trend_status
SELECT enumlabel as valid_status_values
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
ORDER BY enumsortorder;

-- 5. Check if status column is using the enum or text
SELECT 
    column_name,
    data_type,
    udt_name
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
AND column_name = 'status';

-- 6. Check for any RLS policies that might affect inserts
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