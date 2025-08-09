-- SIMPLE FIX: Just fix the RLS policies
-- This is likely the main issue preventing trends from showing in verify page

-- Step 1: Enable RLS and create permissive SELECT policy
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop any restrictive SELECT policies
DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;

-- Create a completely open SELECT policy - all authenticated users can view all trends
CREATE POLICY "Enable read access for all users" ON public.trend_submissions
    FOR SELECT 
    USING (true);  -- This allows EVERYONE to SELECT/view trends

-- Step 2: Do the same for trend_validations
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_validations;

CREATE POLICY "Enable read access for all users" ON public.trend_validations
    FOR SELECT 
    USING (true);

-- Step 3: Quick test - this should return trends if RLS was the issue
SELECT 
    COUNT(*) as trends_visible_after_fix
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating');

-- Step 4: Show some trends that should now be visible
SELECT 
    id,
    trend_name,
    status,
    created_at
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating')
ORDER BY created_at DESC
LIMIT 5;