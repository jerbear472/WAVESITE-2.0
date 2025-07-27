-- Debug script for timeline RLS issues

-- Check if the trend_submissions table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
) as table_exists;

-- Check current RLS policies on trend_submissions
SELECT 
    pol.polname as policy_name,
    pol.polcmd as command,
    pol.polroles as roles,
    CASE 
        WHEN pol.polpermissive THEN 'PERMISSIVE' 
        ELSE 'RESTRICTIVE' 
    END as type,
    pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
    pg_get_expr(pol.polwithcheck, pol.polrelid) as with_check_expression
FROM pg_policy pol
JOIN pg_class pc ON pol.polrelid = pc.oid
WHERE pc.relname = 'trend_submissions';

-- Check if RLS is enabled on the table
SELECT relrowsecurity 
FROM pg_class 
WHERE relname = 'trend_submissions';

-- Create or replace RLS policies for trend_submissions
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can insert own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all approved trends" ON public.trend_submissions;

-- Create new policies
CREATE POLICY "Users can view own trend submissions"
    ON public.trend_submissions
    FOR SELECT
    USING (auth.uid() = spotter_id);

CREATE POLICY "Users can insert own trend submissions"
    ON public.trend_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update own trend submissions"
    ON public.trend_submissions
    FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Allow users to see approved/viral trends from all users
CREATE POLICY "Users can view all approved trends"
    ON public.trend_submissions
    FOR SELECT
    USING (status IN ('approved', 'viral', 'validating'));

-- Grant necessary permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Test query to see if we can access the table
-- This should be run as an authenticated user
SELECT 
    id,
    spotter_id,
    category,
    status,
    created_at
FROM public.trend_submissions
WHERE spotter_id = auth.uid()
LIMIT 5;