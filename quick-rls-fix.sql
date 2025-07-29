-- Quick RLS Fix - Run this in Supabase SQL Editor

-- 1. Drop all existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', pol.policyname);
    END LOOP;
END $$;

-- 2. Create a simple policy that allows users to manage their own trends
CREATE POLICY "users_manage_own_trends" ON public.trend_submissions
    FOR ALL
    TO authenticated
    USING (auth.uid() = spotter_id)
    WITH CHECK (auth.uid() = spotter_id);

-- 3. Grant permissions (without sequence)
GRANT ALL ON public.trend_submissions TO authenticated;

-- 4. Verify it worked
SELECT COUNT(*) as policy_count FROM pg_policies WHERE tablename = 'trend_submissions';

-- 5. If you want to temporarily test without RLS (WARNING: only for debugging!)
-- ALTER TABLE public.trend_submissions DISABLE ROW LEVEL SECURITY;