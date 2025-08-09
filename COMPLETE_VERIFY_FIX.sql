-- COMPLETE FIX FOR VERIFY PAGE - Handles enum issues
-- Run this in Supabase SQL Editor

-- Step 1: Check current enum values
DO $$
DECLARE
    has_pending BOOLEAN := false;
    has_submitted BOOLEAN := false;
BEGIN
    -- Check if 'pending' exists in enum
    SELECT EXISTS (
        SELECT 1 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'trend_status' AND e.enumlabel = 'pending'
    ) INTO has_pending;
    
    -- Check if 'submitted' exists in enum
    SELECT EXISTS (
        SELECT 1 
        FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'trend_status' AND e.enumlabel = 'submitted'
    ) INTO has_submitted;
    
    -- Add 'pending' if it doesn't exist
    IF NOT has_pending THEN
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'validating';
        RAISE NOTICE 'Added pending to trend_status enum';
    END IF;
    
    -- Add 'submitted' if it doesn't exist
    IF NOT has_submitted THEN
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'submitted' BEFORE 'validating';
        RAISE NOTICE 'Added submitted to trend_status enum';
    END IF;
END $$;

-- Step 2: Fix RLS policies
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can insert own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can delete own trends" ON public.trend_submissions;

-- Create new policies
CREATE POLICY "Enable read access for all users" ON public.trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (true);  -- Allow any user to insert (spotter_id will be set by trigger/app)

CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);

CREATE POLICY "Users can delete own trends" ON public.trend_submissions
    FOR DELETE USING (auth.uid() = spotter_id);

-- Step 3: Fix trend_validations policies
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can create validations" ON public.trend_validations;

CREATE POLICY "Enable read access for all users" ON public.trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Users can create validations" ON public.trend_validations
    FOR INSERT WITH CHECK (true);  -- Allow any authenticated user to validate

-- Step 4: Update any NULL or invalid status to 'submitted'
UPDATE public.trend_submissions
SET status = 'submitted'
WHERE status IS NULL 
   OR status = ''
   OR (validation_count = 0 OR validation_count IS NULL);

-- Step 5: Verify the fix
SELECT 
    'Status values in database:' as info,
    status,
    COUNT(*) as count
FROM public.trend_submissions
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY status
ORDER BY count DESC;

-- Step 6: Show trends available for validation
SELECT 
    'Trends ready for validation:' as info,
    COUNT(*) as total_available
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating', 'pending')
  AND created_at > NOW() - INTERVAL '7 days';

-- Step 7: Sample of available trends
SELECT 
    id,
    trend_name,
    description,
    status,
    created_at,
    spotter_id
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating', 'pending')
ORDER BY created_at DESC
LIMIT 5;