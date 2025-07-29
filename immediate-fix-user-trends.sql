-- Immediate Fix for User Trend Visibility

-- STEP 1: First, check if you have any trends
-- Replace 'your-email@example.com' with your actual email
SELECT 
    u.id as your_user_id,
    u.email,
    COUNT(t.id) as your_trends_count
FROM auth.users u
LEFT JOIN trend_submissions t ON t.spotter_id = u.id
WHERE u.email = 'your-email@example.com'
GROUP BY u.id, u.email;

-- STEP 2: Create a more permissive RLS policy
-- Drop existing policies
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', pol.policyname);
    END LOOP;
END $$;

-- Create new policy that's more permissive
CREATE POLICY "users_see_own_trends_permissive" ON public.trend_submissions
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = spotter_id 
        OR 
        auth.uid() IN (SELECT id FROM auth.users WHERE id = spotter_id)
    );

CREATE POLICY "users_insert_trends_permissive" ON public.trend_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "users_update_own_trends_permissive" ON public.trend_submissions
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = spotter_id)
    WITH CHECK (auth.uid() = spotter_id);

-- STEP 3: Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;

-- STEP 4: If still not working, check for profile mismatch
-- Some systems use a separate profiles table
SELECT 
    'Auth Users' as source,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
    'Profiles Table' as source,
    COUNT(*) as count
FROM public.profiles

UNION ALL

SELECT 
    'User Profiles Table' as source,
    COUNT(*) as count
FROM public.user_profiles;

-- STEP 5: Nuclear option - temporarily disable RLS to test
-- Only run this if nothing else works
-- ALTER TABLE public.trend_submissions DISABLE ROW LEVEL SECURITY;
-- Test your app
-- ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;