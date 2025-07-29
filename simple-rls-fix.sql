-- Simple RLS Fix for Trend Timeline
-- Run each section one at a time to identify any issues

-- SECTION 1: Check current state
-- Run this first to see what's happening
SELECT 
    COUNT(*) as total_trends,
    COUNT(DISTINCT spotter_id) as unique_spotters
FROM public.trend_submissions;

-- SECTION 2: Check if RLS is enabled
SELECT rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'trend_submissions';

-- SECTION 3: See current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- SECTION 4: Drop all existing policies
-- This is safe - we'll recreate them
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- SECTION 5: Create the simplest possible policy
-- This allows authenticated users to see and manage their own trends
CREATE POLICY "own_trends_policy" ON public.trend_submissions
    FOR ALL
    TO authenticated
    USING (auth.uid() = spotter_id)
    WITH CHECK (auth.uid() = spotter_id);

-- SECTION 6: Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;

-- SECTION 7: Test the fix
-- Replace 'YOUR_USER_ID' with an actual user ID from your auth.users table
-- You can get this from Supabase Dashboard > Authentication > Users
/*
SELECT id, description, status, created_at
FROM public.trend_submissions
WHERE spotter_id = 'YOUR_USER_ID'
ORDER BY created_at DESC
LIMIT 5;
*/

-- SECTION 8: If you still can't see trends, try this nuclear option
-- This temporarily disables RLS (only for testing!)
/*
ALTER TABLE public.trend_submissions DISABLE ROW LEVEL SECURITY;
-- Test your app now
-- Then re-enable it:
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;
*/