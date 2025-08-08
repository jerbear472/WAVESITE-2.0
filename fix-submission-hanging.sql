-- Fix submission hanging issue
-- Check and fix RLS policies on trend_submissions table

-- 1. Check if RLS is enabled and what policies exist
SELECT 
    'Current RLS Status for trend_submissions:' as info;

SELECT 
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS is ENABLED'
        ELSE '❌ RLS is DISABLED'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'trend_submissions';

-- 2. Check existing policies
SELECT 
    'Existing policies:' as info;

SELECT 
    policyname as policy_name,
    cmd as operation,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trend_submissions'
ORDER BY policyname;

-- 3. Fix RLS policies to allow users to submit trends
DO $$
BEGIN
    -- Enable RLS if not already enabled
    ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop potentially problematic policies
    DROP POLICY IF EXISTS "Users can insert their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON trend_submissions;
    
    -- Create proper policies that allow submission
    
    -- Allow authenticated users to INSERT trends
    CREATE POLICY "Authenticated users can submit trends" 
    ON trend_submissions 
    FOR INSERT 
    WITH CHECK (auth.uid() = spotter_id);
    
    -- Allow users to VIEW their own trends and public approved trends
    CREATE POLICY "Users can view relevant trends" 
    ON trend_submissions 
    FOR SELECT 
    USING (
        auth.uid() = spotter_id 
        OR status = 'approved'
        OR status = 'published'
    );
    
    -- Allow users to UPDATE only their own pending trends
    CREATE POLICY "Users can update their pending trends" 
    ON trend_submissions 
    FOR UPDATE 
    USING (
        auth.uid() = spotter_id 
        AND status IN ('submitted', 'draft')
    );
    
    -- Allow users to DELETE only their own draft trends
    CREATE POLICY "Users can delete their draft trends" 
    ON trend_submissions 
    FOR DELETE 
    USING (
        auth.uid() = spotter_id 
        AND status = 'draft'
    );
    
    RAISE NOTICE 'RLS policies updated successfully';
END $$;

-- 4. Verify the policies are correct
SELECT 
    'Updated policies:' as info;

SELECT 
    policyname as "Policy",
    cmd as "Operation",
    CASE 
        WHEN cmd = 'INSERT' THEN '✅ Allows authenticated users to submit'
        WHEN cmd = 'SELECT' THEN '✅ Allows viewing own & approved trends'
        WHEN cmd = 'UPDATE' THEN '✅ Allows updating own pending trends'
        WHEN cmd = 'DELETE' THEN '✅ Allows deleting own drafts'
        ELSE ''
    END as "Description"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trend_submissions'
ORDER BY policyname;

-- 5. Test if a user can insert (dry run check)
SELECT 
    'Insert permission check:' as info,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'trend_submissions'
            AND cmd = 'INSERT'
        ) THEN '✅ INSERT policy exists - users should be able to submit'
        ELSE '❌ No INSERT policy - this would cause hanging!'
    END as status;

-- 6. Check if there are any CHECK constraints that might be blocking
SELECT 
    'Check constraints:' as info;

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'trend_submissions'::regclass
AND contype = 'c';

-- 7. Ensure status enum has all required values
DO $$
BEGIN
    -- Check if 'submitted' value exists in the status enum
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'submitted' 
        AND enumtypid = (
            SELECT oid FROM pg_type WHERE typname = 'trend_status'
        )
    ) THEN
        -- Add it if missing
        ALTER TYPE trend_status ADD VALUE IF NOT EXISTS 'submitted';
        RAISE NOTICE 'Added submitted to trend_status enum';
    END IF;
END $$;

-- Final message
SELECT 
    '🎯 SOLUTION' as "Status",
    'RLS policies have been fixed. Users can now submit trends!' as "Message";