-- Fix timeline access issues

-- First, ensure RLS is enabled
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can insert own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all approved trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.trend_submissions;

-- Create a simple policy that allows users to see their own submissions
CREATE POLICY "Users can view own submissions"
    ON public.trend_submissions
    FOR SELECT
    USING (auth.uid() = spotter_id);

-- Allow users to insert their own submissions
CREATE POLICY "Users can create submissions"
    ON public.trend_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

-- Allow users to update their own submissions
CREATE POLICY "Users can update own submissions"
    ON public.trend_submissions
    FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Optional: Allow all authenticated users to view approved/viral trends
CREATE POLICY "All users can view approved trends"
    ON public.trend_submissions
    FOR SELECT
    USING (status IN ('approved', 'viral') AND auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Create or replace a simpler version of the get_user_timeline function
CREATE OR REPLACE FUNCTION public.get_user_timeline_simple(p_user_id UUID)
RETURNS SETOF public.trend_submissions
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT * 
    FROM public.trend_submissions 
    WHERE spotter_id = p_user_id
    ORDER BY created_at DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_timeline_simple(UUID) TO authenticated;

-- Test function to check if user can see any trends
CREATE OR REPLACE FUNCTION public.debug_user_trends()
RETURNS TABLE (
    user_id UUID,
    trend_count BIGINT,
    latest_trend_date TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        auth.uid() as user_id,
        COUNT(*) as trend_count,
        MAX(created_at) as latest_trend_date
    FROM public.trend_submissions
    WHERE spotter_id = auth.uid()
    GROUP BY auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.debug_user_trends() TO authenticated;