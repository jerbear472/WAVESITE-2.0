-- Fix RLS policies for trend submissions
-- The issue is that the policy checks auth.uid() = spotter_id but we need to allow inserts

-- Drop existing insert policy if it exists
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;

-- Create a more permissive insert policy
CREATE POLICY "Authenticated users can submit trends" ON public.trend_submissions
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Update the trend submission after insert to set the correct spotter_id
CREATE OR REPLACE FUNCTION public.set_trend_spotter_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.spotter_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set spotter_id
DROP TRIGGER IF EXISTS set_trend_spotter ON public.trend_submissions;
CREATE TRIGGER set_trend_spotter
    BEFORE INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_trend_spotter_id();

-- Also ensure users can update their own submissions
DROP POLICY IF EXISTS "Users can update their own submissions" ON public.trend_submissions;
CREATE POLICY "Users can update their own submissions" ON public.trend_submissions
FOR UPDATE 
USING (auth.uid() = spotter_id)
WITH CHECK (auth.uid() = spotter_id);

-- Verify profile creation is working
SELECT 'Checking if user profiles exist:' as message;
SELECT id, username, email, spotter_tier, total_earnings 
FROM public.user_profiles 
ORDER BY created_at DESC 
LIMIT 5;

-- Check if the trigger exists
SELECT 'Checking if user creation trigger exists:' as message;
SELECT tgname, tgrelid::regclass, proname 
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- If trigger doesn't exist, recreate it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
    ) THEN
        CREATE TRIGGER on_auth_user_created
            AFTER INSERT ON auth.users
            FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
        RAISE NOTICE 'Trigger recreated';
    ELSE
        RAISE NOTICE 'Trigger already exists';
    END IF;
END $$;