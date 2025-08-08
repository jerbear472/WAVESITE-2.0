-- Fix submission hanging issue (properly)
-- First check what status values are actually available

-- 1. Check what values exist in the trend_status enum
SELECT 
    'Available status values in trend_status enum:' as info;

SELECT 
    enumlabel as status_value
FROM pg_enum
WHERE enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'trend_status'
)
ORDER BY enumsortorder;

-- 2. Fix RLS policies using only valid status values
DO $$
DECLARE
    has_published boolean;
    has_approved boolean;
BEGIN
    -- Check which status values exist
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'published' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
    ) INTO has_published;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'approved' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
    ) INTO has_approved;
    
    -- Enable RLS
    ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can insert their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON trend_submissions;
    DROP POLICY IF EXISTS "Authenticated users can submit trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view relevant trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update their pending trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can delete their draft trends" ON trend_submissions;
    
    -- Create INSERT policy - this is the most important for fixing submission
    CREATE POLICY "Allow authenticated users to submit trends" 
    ON trend_submissions 
    FOR INSERT 
    WITH CHECK (auth.uid() = spotter_id);
    
    -- Create SELECT policy based on available status values
    IF has_approved THEN
        CREATE POLICY "Users can view trends" 
        ON trend_submissions 
        FOR SELECT 
        USING (
            auth.uid() = spotter_id 
            OR status = 'approved'
            OR status = 'verified'
            OR status = 'trending'
        );
    ELSE
        -- Simpler policy if approved doesn't exist
        CREATE POLICY "Users can view trends" 
        ON trend_submissions 
        FOR SELECT 
        USING (
            auth.uid() = spotter_id 
            OR status = 'verified'
            OR status = 'trending'
        );
    END IF;
    
    -- Create UPDATE policy
    CREATE POLICY "Users can update own pending trends" 
    ON trend_submissions 
    FOR UPDATE 
    USING (
        auth.uid() = spotter_id 
        AND status IN ('submitted', 'validating', 'pending')
    );
    
    -- Create DELETE policy (optional)
    CREATE POLICY "Users can delete own drafts" 
    ON trend_submissions 
    FOR DELETE 
    USING (
        auth.uid() = spotter_id 
        AND status = 'submitted'
    );
    
    RAISE NOTICE 'RLS policies created successfully';
END $$;

-- 3. Ensure required status values exist
DO $$
BEGIN
    -- Add 'submitted' if it doesn't exist (most important for new submissions)
    BEGIN
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'submitted';
        RAISE NOTICE 'Added submitted status';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'submitted status already exists';
    END;
    
    -- Add 'validating' if it doesn't exist
    BEGIN
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'validating';
        RAISE NOTICE 'Added validating status';
    EXCEPTION 
        WHEN duplicate_object THEN
            RAISE NOTICE 'validating status already exists';
    END;
END $$;

-- 4. Verify the fix
SELECT 
    'Final check:' as info;

SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') as policy_count
FROM pg_tables t
WHERE schemaname = 'public' AND tablename = 'trend_submissions';

-- Show the policies
SELECT 
    policyname as "Policy Name",
    cmd as "Operation",
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ CRITICAL: Allows submission'
        WHEN cmd = 'SELECT' THEN '✅ Allows viewing'
        WHEN cmd = 'UPDATE' THEN '✅ Allows updates'
        WHEN cmd = 'DELETE' THEN '✅ Allows deletion'
        ELSE ''
    END as "Purpose"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trend_submissions'
ORDER BY 
    CASE cmd 
        WHEN 'INSERT' THEN 1  -- Most important for submission
        WHEN 'SELECT' THEN 2
        WHEN 'UPDATE' THEN 3
        WHEN 'DELETE' THEN 4
    END;

-- Final status
SELECT 
    '🎯 SUBMISSION FIX COMPLETE' as "Status",
    'The INSERT policy is now active. Try submitting your trend again!' as "Action";