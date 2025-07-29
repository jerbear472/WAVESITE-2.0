-- Fix Trend Timeline Visibility Issue (Updated)
-- This script addresses the issue where submitted trends don't appear in the timeline

-- 1. First, let's check what RLS policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'trend_submissions'
ORDER BY policyname;

-- 2. Check if RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'trend_submissions';

-- 3. Check the table structure to understand ID generation
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', r.policyname);
    END LOOP;
END $$;

-- 5. Create simple, permissive policies that should work

-- Allow authenticated users to view their own trends
CREATE POLICY "users_view_own_trends" ON public.trend_submissions
    FOR SELECT
    TO authenticated
    USING (auth.uid() = spotter_id);

-- Allow authenticated users to insert trends with their own ID
CREATE POLICY "users_insert_own_trends" ON public.trend_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = spotter_id);

-- Allow authenticated users to update their own trends
CREATE POLICY "users_update_own_trends" ON public.trend_submissions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = spotter_id)
    WITH CHECK (auth.uid() = spotter_id);

-- Allow authenticated users to delete their own trends
CREATE POLICY "users_delete_own_trends" ON public.trend_submissions
    FOR DELETE
    TO authenticated
    USING (auth.uid() = spotter_id);

-- 6. Grant necessary permissions (without sequence since it might not exist)
GRANT ALL ON public.trend_submissions TO authenticated;

-- 7. Verify the new policies
SELECT 
    policyname,
    cmd,
    permissive,
    qual
FROM pg_policies 
WHERE tablename = 'trend_submissions'
ORDER BY policyname;

-- 8. Check if there are any trends in the table at all
SELECT 
    COUNT(*) as total_trends,
    COUNT(DISTINCT spotter_id) as unique_users,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as submitted_trends,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as trends_last_24h
FROM public.trend_submissions;

-- 9. Debug: Show the most recent trends (without RLS)
-- This helps verify if data is actually being inserted
SELECT 
    id,
    spotter_id,
    description,
    status,
    created_at
FROM public.trend_submissions
ORDER BY created_at DESC
LIMIT 10;

-- 10. Alternative: If policies still cause issues, try this more permissive approach
-- Uncomment and run if needed:
/*
-- Drop all policies again
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', r.policyname);
    END LOOP;
END $$;

-- Create a single, very permissive policy for authenticated users
CREATE POLICY "authenticated_users_full_access" ON public.trend_submissions
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (auth.uid() = spotter_id);
*/