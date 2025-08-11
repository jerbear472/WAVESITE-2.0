-- FINAL RLS FIX - Run this in Supabase SQL Editor
-- This will fix the trend submission RLS policy issue

-- ============================================
-- FIX TREND SUBMISSIONS RLS
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view approved trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.trend_submissions;

-- Create new, working policies
CREATE POLICY "Public can view approved trends" ON public.trend_submissions
    FOR SELECT 
    USING (status IN ('approved', 'viral'));

CREATE POLICY "Users can view own submissions" ON public.trend_submissions
    FOR SELECT 
    USING (auth.uid() = spotter_id);

CREATE POLICY "Users can view trends for validation" ON public.trend_submissions
    FOR SELECT
    USING (status IN ('submitted', 'validating') AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert trends" ON public.trend_submissions
    FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE 
    USING (auth.uid() = spotter_id)
    WITH CHECK (auth.uid() = spotter_id);

-- ============================================
-- AUTO-SET SPOTTER_ID FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.set_trend_spotter_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If spotter_id is not provided, use the authenticated user's ID
    IF NEW.spotter_id IS NULL THEN
        NEW.spotter_id = auth.uid();
    END IF;
    
    -- Ensure the spotter_id matches the authenticated user
    -- This prevents users from submitting trends as someone else
    IF NEW.spotter_id != auth.uid() THEN
        RAISE EXCEPTION 'Cannot submit trends for another user';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_trend_spotter ON public.trend_submissions;
CREATE TRIGGER set_trend_spotter
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trend_spotter_id();

-- ============================================
-- FIX USER PROFILES RLS (if needed)
-- ============================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT 
    USING (auth.uid() = id);

CREATE POLICY "Users can view all profiles" ON public.user_profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================
-- VERIFY SETUP
-- ============================================

-- Check if we have users
SELECT 'Current users in system:' as status;
SELECT id, username, email, spotter_tier, total_earnings 
FROM public.user_profiles 
ORDER BY created_at DESC;

-- Check if we have any trends
SELECT 'Current trends in system:' as status;
SELECT id, status, description, spotter_id 
FROM public.trend_submissions 
ORDER BY created_at DESC
LIMIT 5;

-- Success message
SELECT '✅ RLS policies have been updated! Users should now be able to submit trends.' as message;