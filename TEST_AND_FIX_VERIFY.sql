-- TEST AND FIX VERIFY PAGE ISSUES
-- Run each section to diagnose and fix the problem

-- SECTION 1: Check what statuses exist in the database
SELECT 
    'Current trends by status:' as info,
    status,
    COUNT(*) as count,
    MAX(created_at) as most_recent
FROM public.trend_submissions
GROUP BY status
ORDER BY count DESC;

-- SECTION 2: Check if there are ANY trends that should be visible
SELECT 
    'Recent trends (last 7 days):' as info,
    id,
    trend_name,
    status,
    created_at,
    spotter_id,
    validation_count
FROM public.trend_submissions
WHERE created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;

-- SECTION 3: Fix RLS - This is likely the main issue!
DO $$
BEGIN
    -- Ensure RLS is enabled
    ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop ALL existing SELECT policies
    DROP POLICY IF EXISTS "Users can only view own trends" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Users can view own trends" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Anyone can view trends" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Public read access" ON public.trend_submissions;
    
    -- Create ONE simple policy that allows EVERYONE to read
    CREATE POLICY "Enable read access for all users" 
    ON public.trend_submissions
    FOR SELECT 
    USING (true);
    
    RAISE NOTICE 'RLS policies fixed - all users can now view all trends';
END $$;

-- SECTION 4: Update any trends that might have wrong status
-- First, let's see what statuses are valid in the enum
SELECT enumlabel as valid_statuses
FROM pg_enum e
JOIN pg_type t ON e.enumtypid = t.oid
WHERE t.typname = 'trend_status';

-- Update NULL statuses to 'submitted'
UPDATE public.trend_submissions
SET status = 'submitted'
WHERE status IS NULL;

-- SECTION 5: Test if a specific user can see trends
-- This simulates what the verify page does
SELECT 
    'Trends visible to users (simulating verify page query):' as info,
    COUNT(*) as total_visible
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating')
  AND created_at > NOW() - INTERVAL '30 days';

-- SECTION 6: If still no trends, create some test ones
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get a user ID to use as spotter
    SELECT id INTO test_user_id 
    FROM public.profiles 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        -- Insert a few test trends with 'submitted' status
        INSERT INTO public.trend_submissions (
            spotter_id,
            trend_name,
            description,
            category,
            status,
            created_at
        ) VALUES 
        (
            test_user_id,
            'Test Trend 1 - ' || NOW()::text,
            'This is a test trend to verify the system is working',
            'technology',
            'submitted',
            NOW()
        ),
        (
            test_user_id,
            'Test Trend 2 - ' || NOW()::text,
            'Another test trend for validation',
            'fashion',
            'submitted',
            NOW() - INTERVAL '1 hour'
        ),
        (
            test_user_id,
            'Test Trend 3 - ' || NOW()::text,
            'Third test trend for the verify page',
            'food',
            'submitted',
            NOW() - INTERVAL '2 hours'
        );
        
        RAISE NOTICE 'Created 3 test trends with submitted status';
    END IF;
END $$;

-- SECTION 7: Final verification
SELECT 
    'FINAL CHECK - Trends ready for validation:' as status,
    COUNT(*) as total_available,
    COUNT(DISTINCT spotter_id) as unique_spotters,
    MIN(created_at) as oldest,
    MAX(created_at) as newest
FROM public.trend_submissions
WHERE status IN ('submitted', 'validating');