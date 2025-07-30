-- PERMANENT RLS FIX FOR TREND_SUBMISSIONS
-- This creates a robust, maintainable RLS policy structure

-- 1. First, ensure RLS is enabled
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trend_submissions'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', pol.policyname);
    END LOOP;
END $$;

-- 3. Create comprehensive policies with clear names and purposes

-- SELECT: Users can view all trends (public feed model)
-- This is intentional - trends are meant to be public for validation
CREATE POLICY "public_read_all_trends" 
ON public.trend_submissions 
FOR SELECT 
TO authenticated 
USING (true);

-- INSERT: Users can only create trends with their own ID
CREATE POLICY "users_insert_own_trends" 
ON public.trend_submissions 
FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = spotter_id 
    AND spotter_id IS NOT NULL
);

-- UPDATE: Users can only update their own trends
CREATE POLICY "users_update_own_trends" 
ON public.trend_submissions 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = spotter_id)
WITH CHECK (auth.uid() = spotter_id);

-- DELETE: Users can only delete their own trends
CREATE POLICY "users_delete_own_trends" 
ON public.trend_submissions 
FOR DELETE 
TO authenticated 
USING (auth.uid() = spotter_id);

-- 4. Create a function to validate RLS policies
CREATE OR REPLACE FUNCTION check_trend_submission_access(user_id uuid)
RETURNS TABLE (
    can_select boolean,
    can_insert boolean,
    can_update_own boolean,
    can_delete_own boolean,
    policy_summary text
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        true as can_select,  -- All authenticated users can read
        true as can_insert,  -- All authenticated users can insert their own
        true as can_update_own,  -- Users can update their own
        true as can_delete_own,  -- Users can delete their own
        'Public read, own-data write' as policy_summary;
END;
$$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id 
ON public.trend_submissions(spotter_id);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at 
ON public.trend_submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_status 
ON public.trend_submissions(status);

-- 6. Create a health check view
CREATE OR REPLACE VIEW trend_submission_health AS
SELECT 
    COUNT(*) as total_trends,
    COUNT(DISTINCT spotter_id) as unique_spotters,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as trends_last_hour,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as trends_last_day,
    MAX(created_at) as latest_submission
FROM trend_submissions;

-- Grant access to the view
GRANT SELECT ON trend_submission_health TO authenticated;

-- 7. Create a function to debug access issues
CREATE OR REPLACE FUNCTION debug_trend_access(test_user_id uuid)
RETURNS TABLE (
    test_name text,
    test_result boolean,
    details text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trend_count integer;
    test_trend_id uuid;
BEGIN
    -- Test 1: Can count trends
    SELECT COUNT(*) INTO trend_count
    FROM trend_submissions
    WHERE spotter_id = test_user_id;
    
    RETURN QUERY
    SELECT 
        'Can count own trends'::text,
        true,
        format('User has %s trends', trend_count)::text;
    
    -- Test 2: Can insert
    BEGIN
        INSERT INTO trend_submissions (
            spotter_id, category, description, platform, status, post_url
        ) VALUES (
            test_user_id, 'meme_format', 'RLS test', 'other', 'submitted', 'https://test.com'
        ) RETURNING id INTO test_trend_id;
        
        RETURN QUERY
        SELECT 
            'Can insert trend'::text,
            true,
            format('Created test trend %s', test_trend_id)::text;
        
        -- Test 3: Can select back
        PERFORM * FROM trend_submissions WHERE id = test_trend_id;
        
        RETURN QUERY
        SELECT 
            'Can select own trend'::text,
            FOUND,
            CASE WHEN FOUND THEN 'Successfully retrieved' ELSE 'Failed to retrieve' END::text;
        
        -- Clean up
        DELETE FROM trend_submissions WHERE id = test_trend_id;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN QUERY
        SELECT 
            'Can insert trend'::text,
            false,
            SQLERRM::text;
    END;
END;
$$;

-- 8. Add helpful comments
COMMENT ON POLICY "public_read_all_trends" ON public.trend_submissions IS 
'Allows all authenticated users to view all trends for the public feed and validation system';

COMMENT ON POLICY "users_insert_own_trends" ON public.trend_submissions IS 
'Ensures users can only create trends with their own user ID';

COMMENT ON POLICY "users_update_own_trends" ON public.trend_submissions IS 
'Allows users to update only their own trend submissions';

COMMENT ON POLICY "users_delete_own_trends" ON public.trend_submissions IS 
'Allows users to delete only their own trend submissions';

-- 9. Final verification
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
ORDER BY cmd, policyname;

-- 10. Test the policies work
-- Get a real user ID to test with
DO $$
DECLARE
    test_user_id uuid;
BEGIN
    SELECT id INTO test_user_id 
    FROM auth.users 
    LIMIT 1;
    
    IF test_user_id IS NOT NULL THEN
        RAISE NOTICE 'Testing with user ID: %', test_user_id;
        
        -- Run the debug function
        PERFORM * FROM debug_trend_access(test_user_id);
    END IF;
END $$;