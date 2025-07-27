-- Check existing RLS policies
SELECT * FROM pg_policies WHERE tablename = 'trend_submissions';

-- Drop existing policies if needed (uncomment to run)
-- DROP POLICY IF EXISTS "Anyone can view approved trends" ON trend_submissions;
-- DROP POLICY IF EXISTS "Users can view their own submissions" ON trend_submissions;
-- DROP POLICY IF EXISTS "Authenticated users can submit trends" ON trend_submissions;

-- Create new RLS policies that should work
-- Policy 1: Users can view their own trends
CREATE POLICY "Users can view own trends" ON trend_submissions
    FOR SELECT
    USING (auth.uid() = spotter_id);

-- Policy 2: Users can view all approved/viral trends
CREATE POLICY "Users can view public trends" ON trend_submissions
    FOR SELECT
    USING (status IN ('approved', 'viral'));

-- Policy 3: Authenticated users can insert their own trends
CREATE POLICY "Users can create trends" ON trend_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

-- Policy 4: Users can update their own pending trends
CREATE POLICY "Users can update own pending trends" ON trend_submissions
    FOR UPDATE
    USING (auth.uid() = spotter_id AND status = 'submitted')
    WITH CHECK (auth.uid() = spotter_id);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON trend_submissions TO authenticated;

-- Verify the policies
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
ORDER BY policyname;