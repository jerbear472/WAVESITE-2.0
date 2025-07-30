-- Fix timeline visibility issue (again)
-- This is the same issue we had before - trends submit but don't show

-- 1. First, check current RLS policies
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'trend_submissions'
ORDER BY policyname;

-- 2. Drop existing SELECT policies that might be too restrictive
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can select their own trends" ON public.trend_submissions;

-- 3. Create a simple, permissive SELECT policy
CREATE POLICY "Users can view all trend submissions" 
ON public.trend_submissions 
FOR SELECT 
TO authenticated 
USING (true);

-- 4. Ensure INSERT policy exists for users to create trends
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can insert their own trends" ON public.trend_submissions;

CREATE POLICY "Users can insert their own trends" 
ON public.trend_submissions 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = spotter_id);

-- 5. Ensure UPDATE policy exists
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update their own trends" ON public.trend_submissions;

CREATE POLICY "Users can update their own trends" 
ON public.trend_submissions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = spotter_id)
WITH CHECK (auth.uid() = spotter_id);

-- 6. Ensure DELETE policy exists
DROP POLICY IF EXISTS "Users can delete their own trends" ON public.trend_submissions;

CREATE POLICY "Users can delete their own trends" 
ON public.trend_submissions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = spotter_id);

-- 7. Verify the changes
SELECT 
    tablename,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'trend_submissions'
ORDER BY cmd, policyname;

-- 8. Test with your specific user (get your ID first)
SELECT id, email FROM auth.users WHERE email = 'jeremyuys@gmail.com';

-- 9. Count trends for all users to verify data exists
SELECT 
    spotter_id,
    COUNT(*) as trend_count,
    MAX(created_at) as latest_submission
FROM trend_submissions
GROUP BY spotter_id
ORDER BY latest_submission DESC
LIMIT 10;