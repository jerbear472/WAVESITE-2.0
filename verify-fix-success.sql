-- Verify the Fix Was Successful

-- 1. Check if all users now have profiles
SELECT 
    'Users without profiles' as check_item,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE p.id IS NULL

UNION ALL

-- 2. Check if the trigger was created
SELECT 
    'Profile creation trigger' as check_item,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'

UNION ALL

-- 3. Check if RLS policies were created
SELECT 
    'RLS policies for trends' as check_item,
    COUNT(*) as count,
    CASE WHEN COUNT(*) = 4 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies
WHERE tablename = 'trend_submissions'

UNION ALL

-- 4. Check if foreign key constraint exists
SELECT 
    'Foreign key constraint' as check_item,
    COUNT(*) as count,
    CASE WHEN COUNT(*) > 0 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.table_constraints
WHERE table_name = 'trend_submissions'
AND constraint_type = 'FOREIGN KEY'
AND constraint_name LIKE '%spotter_id%';

-- 5. Show current system stats
SELECT 
    'Total users' as metric,
    COUNT(*) as value
FROM auth.users
UNION ALL
SELECT 
    'Total profiles' as metric,
    COUNT(*) as value
FROM public.profiles
UNION ALL
SELECT 
    'Total trends' as metric,
    COUNT(*) as value
FROM trend_submissions
UNION ALL
SELECT 
    'Trends in last hour' as metric,
    COUNT(*) as value
FROM trend_submissions
WHERE created_at > NOW() - INTERVAL '1 hour';