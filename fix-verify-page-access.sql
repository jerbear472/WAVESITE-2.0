-- Fix RLS policies to ensure users can see trends for verification
-- This ensures the verify page can show trends from other users

-- Check current RLS policies on trend_submissions
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
WHERE tablename = 'trend_submissions'
ORDER BY policyname;

-- Drop any overly restrictive SELECT policies that might be blocking access
DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;

-- Create a proper policy that allows users to see all trends for validation
-- but only edit their own
DROP POLICY IF EXISTS "Users can view all trends for validation" ON public.trend_submissions;
CREATE POLICY "Users can view all trends for validation" ON public.trend_submissions
    FOR SELECT
    USING (true);  -- Allow all authenticated users to view trends

-- Ensure users can still only update their own trends
DROP POLICY IF EXISTS "Users can update own trends" ON public.trend_submissions;
CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Ensure users can only delete their own trends
DROP POLICY IF EXISTS "Users can delete own trends" ON public.trend_submissions;
CREATE POLICY "Users can delete own trends" ON public.trend_submissions
    FOR DELETE
    USING (auth.uid() = spotter_id);

-- Ensure users can insert trends
DROP POLICY IF EXISTS "Users can insert trends" ON public.trend_submissions;
CREATE POLICY "Users can insert trends" ON public.trend_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = spotter_id OR spotter_id IS NULL);

-- Check trend_validations table policies too
DROP POLICY IF EXISTS "Users can view validations" ON public.trend_validations;
CREATE POLICY "Users can view validations" ON public.trend_validations
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Users can create validations" ON public.trend_validations;
CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT
    WITH CHECK (auth.uid() = validator_id);

-- Verify the policies are working
SELECT 
    'RLS policies updated' as status,
    COUNT(*) as total_policies
FROM pg_policies
WHERE tablename IN ('trend_submissions', 'trend_validations');

-- Test query to see what trends are available
SELECT 
    id,
    trend_name,
    status,
    created_at,
    spotter_id
FROM public.trend_submissions
WHERE status IN ('pending', 'submitted', 'validating')
ORDER BY created_at DESC
LIMIT 10;