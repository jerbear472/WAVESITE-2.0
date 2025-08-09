-- COMPLETE FIX FOR VERIFY PAGE NOT SHOWING TRENDS
-- Run this in Supabase SQL Editor to fix the issue immediately

-- Step 1: Fix RLS policies to allow users to see trends from other users
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Remove overly restrictive policies
DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;

-- Create proper policies
CREATE POLICY "Enable read access for all users" ON public.trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id OR spotter_id IS NULL);

CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);

CREATE POLICY "Users can delete own trends" ON public.trend_submissions
    FOR DELETE USING (auth.uid() = spotter_id);

-- Step 2: Fix trend_validations table policies
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can create validations" ON public.trend_validations;

CREATE POLICY "Enable read access for all users" ON public.trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

-- Step 3: Update any trends with incorrect status
-- Reset recent unvalidated trends to 'pending' status so they appear in verify page
UPDATE public.trend_submissions
SET status = 'pending'
WHERE created_at > NOW() - INTERVAL '30 days'
  AND status NOT IN ('pending', 'submitted', 'validating', 'approved', 'rejected')
  AND (validation_count = 0 OR validation_count IS NULL OR validation_count < 1);

-- Step 4: Ensure newly submitted trends have the correct status
UPDATE public.trend_submissions
SET status = 'pending'
WHERE status IS NULL 
   OR status = '';

-- Step 5: Check if there are trends available for validation
SELECT 
    'Fix Applied! Trends available for validation:' as message,
    COUNT(*) as total_trends_to_validate,
    COUNT(DISTINCT spotter_id) as unique_spotters
FROM public.trend_submissions
WHERE status IN ('pending', 'submitted', 'validating')
  AND created_at > NOW() - INTERVAL '7 days';

-- Step 6: Show sample of available trends
SELECT 
    id,
    trend_name,
    description,
    status,
    created_at,
    validation_count,
    approve_count,
    reject_count
FROM public.trend_submissions
WHERE status IN ('pending', 'submitted', 'validating')
ORDER BY created_at DESC
LIMIT 5;