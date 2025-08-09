-- FINAL FIX FOR VERIFY PAGE - Works with existing enum constraints
-- Run this in Supabase SQL Editor

-- Step 1: Check what enum values exist
SELECT 
    e.enumlabel AS valid_status_values
FROM pg_enum e 
JOIN pg_type t ON e.enumtypid = t.oid 
WHERE t.typname = 'trend_status'
ORDER BY e.enumsortorder;

-- Step 2: Fix RLS policies to allow viewing all trends
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can insert own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can delete own trends" ON public.trend_submissions;

-- Create new permissive policies
CREATE POLICY "Enable read access for all users" ON public.trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id OR spotter_id IS NULL);

CREATE POLICY "Users can delete own trends" ON public.trend_submissions
    FOR DELETE USING (auth.uid() = spotter_id);

-- Step 3: Fix trend_validations policies
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can create validations" ON public.trend_validations;

CREATE POLICY "Enable read access for all users" ON public.trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT WITH CHECK (true);

-- Step 4: Update trends with NULL status to 'submitted'
UPDATE public.trend_submissions
SET status = 'submitted'
WHERE status IS NULL
  AND (validation_count = 0 OR validation_count IS NULL);

-- Step 5: Also update any recent trends that aren't showing up
UPDATE public.trend_submissions
SET status = 'submitted'
WHERE created_at > NOW() - INTERVAL '7 days'
  AND status NOT IN ('submitted', 'validating', 'approved', 'rejected')
  AND (validation_count IS NULL OR validation_count = 0);

-- Step 6: Check current status distribution
SELECT 
    'Current status distribution:' as info,
    status,
    COUNT(*) as count
FROM public.trend_submissions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;

-- Step 7: Check how many trends are available for validation
SELECT 
    'Trends available for validation:' as info,
    COUNT(*) as total
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating')
  AND created_at > NOW() - INTERVAL '7 days';

-- Step 8: Show sample trends that should appear in verify page
SELECT 
    id,
    trend_name,
    SUBSTRING(description, 1, 50) as description_preview,
    status,
    created_at,
    validation_count,
    approve_count,
    reject_count
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating')
ORDER BY created_at DESC
LIMIT 10;

-- Step 9: Verify RLS is not blocking access
SELECT 
    'RLS Policy Check:' as check_type,
    tablename,
    policyname,
    cmd,
    permissive
FROM pg_policies
WHERE tablename = 'trend_submissions'
ORDER BY policyname;