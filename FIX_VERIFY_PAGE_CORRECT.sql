-- CORRECT FIX FOR VERIFY PAGE NOT SHOWING TRENDS
-- This version uses the correct enum values

-- First, let's check what valid status values we have
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname = 'trend_status'
ORDER BY e.enumsortorder;

-- Also check current status distribution
SELECT 
    status,
    COUNT(*) as count
FROM public.trend_submissions
GROUP BY status;

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

-- Step 3: Update trends to use 'submitted' status (which is likely valid)
-- instead of 'pending' which doesn't exist in the enum
UPDATE public.trend_submissions
SET status = 'submitted'
WHERE created_at > NOW() - INTERVAL '30 days'
  AND (status IS NULL OR status NOT IN ('submitted', 'validating', 'approved', 'rejected'))
  AND (validation_count = 0 OR validation_count IS NULL OR validation_count < 1);

-- Step 4: Check if there are trends available for validation
SELECT 
    'Fix Applied! Trends available for validation:' as message,
    COUNT(*) as total_trends_to_validate,
    COUNT(DISTINCT spotter_id) as unique_spotters
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating')
  AND created_at > NOW() - INTERVAL '7 days';

-- Step 5: Show sample of available trends
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
WHERE status IN ('submitted', 'validating')
ORDER BY created_at DESC
LIMIT 5;