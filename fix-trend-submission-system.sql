-- System-Wide Fix for Trend Submission Issues

-- 1. DIAGNOSIS: Check the current state of user/profile synchronization
SELECT 
    'auth.users without profiles' as issue,
    COUNT(*) as count
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE p.id IS NULL

UNION ALL

SELECT 
    'profiles without auth.users' as issue,
    COUNT(*) as count
FROM public.profiles p
LEFT JOIN auth.users a ON p.id = a.id
WHERE a.id IS NULL

UNION ALL

SELECT 
    'trends with invalid spotter_ids' as issue,
    COUNT(*) as count
FROM trend_submissions t
LEFT JOIN auth.users a ON t.spotter_id = a.id
WHERE a.id IS NULL;

-- 2. CREATE TRIGGER: Automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        now()
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        username = COALESCE(profiles.username, EXCLUDED.username);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. FIX EXISTING USERS: Create profiles for all users who don't have one
INSERT INTO public.profiles (id, email, username, created_at)
SELECT 
    a.id,
    a.email,
    COALESCE(a.raw_user_meta_data->>'username', split_part(a.email, '@', 1)),
    COALESCE(a.created_at, now())
FROM auth.users a
LEFT JOIN public.profiles p ON a.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    username = COALESCE(profiles.username, EXCLUDED.username);

-- 4. FIX RLS POLICIES: Ensure they work with the profile system
-- Drop all existing policies on trend_submissions
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', pol.policyname);
    END LOOP;
END $$;

-- Create comprehensive policies that work with the profile system
-- Policy for SELECT: Users can see their own trends
CREATE POLICY "users_view_own_trends" ON public.trend_submissions
    FOR SELECT
    TO authenticated
    USING (
        spotter_id = auth.uid()
        OR spotter_id IN (SELECT id FROM public.profiles WHERE id = auth.uid())
    );

-- Policy for INSERT: Users can only insert with their own ID
CREATE POLICY "users_insert_own_trends" ON public.trend_submissions
    FOR INSERT
    TO authenticated
    WITH CHECK (
        spotter_id = auth.uid()
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
    );

-- Policy for UPDATE: Users can update their own trends
CREATE POLICY "users_update_own_trends" ON public.trend_submissions
    FOR UPDATE
    TO authenticated
    USING (spotter_id = auth.uid())
    WITH CHECK (spotter_id = auth.uid());

-- Policy for DELETE: Users can delete their own trends
CREATE POLICY "users_delete_own_trends" ON public.trend_submissions
    FOR DELETE
    TO authenticated
    USING (spotter_id = auth.uid());

-- 5. VALIDATION: Add a check constraint to ensure spotter_id is valid
-- First, fix any existing invalid spotter_ids by setting them to NULL or deleting
DELETE FROM trend_submissions 
WHERE spotter_id NOT IN (SELECT id FROM auth.users);

-- Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trend_submissions_spotter_id_fkey'
        AND table_name = 'trend_submissions'
    ) THEN
        ALTER TABLE trend_submissions
        ADD CONSTRAINT trend_submissions_spotter_id_fkey 
        FOREIGN KEY (spotter_id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. GRANT PERMISSIONS
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- 7. VERIFY THE FIX
SELECT 
    'Total auth users' as metric,
    COUNT(*) as count
FROM auth.users

UNION ALL

SELECT 
    'Total profiles' as metric,
    COUNT(*) as count
FROM public.profiles

UNION ALL

SELECT 
    'Synced users' as metric,
    COUNT(*) as count
FROM auth.users a
INNER JOIN public.profiles p ON a.id = p.id

UNION ALL

SELECT 
    'Valid trends' as metric,
    COUNT(*) as count
FROM trend_submissions t
INNER JOIN auth.users a ON t.spotter_id = a.id;