-- Verify RLS Fix is Working (Corrected)

-- 1. Check the policy details
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual as using_clause,
    with_check
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- 2. Check if RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
AND tablename = 'trend_submissions';

-- 3. Check recent trends (bypasses RLS - admin view)
SELECT 
    id,
    spotter_id,
    description,
    status,
    created_at,
    CASE 
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN 'Last hour'
        WHEN created_at > NOW() - INTERVAL '24 hours' THEN 'Last 24 hours'
        WHEN created_at > NOW() - INTERVAL '7 days' THEN 'Last week'
        ELSE 'Older'
    END as time_period
FROM public.trend_submissions
ORDER BY created_at DESC
LIMIT 10;

-- 4. Check for any orphaned trends (where spotter_id doesn't match any auth user)
SELECT 
    COUNT(*) as orphaned_trends
FROM public.trend_submissions t
WHERE NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = t.spotter_id
);

-- 5. Get a sample user ID for testing (most recent trend submitter)
SELECT 
    spotter_id,
    COUNT(*) as trend_count,
    MAX(created_at) as most_recent_submission
FROM public.trend_submissions
GROUP BY spotter_id
ORDER BY most_recent_submission DESC
LIMIT 5;