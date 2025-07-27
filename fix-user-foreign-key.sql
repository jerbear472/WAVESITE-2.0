-- Fix foreign key constraint for trend submissions
-- This script ensures users can submit trends without foreign key errors

-- First, let's check if we have the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id, 
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create profiles for existing users
INSERT INTO public.profiles (id, email, username)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Now let's modify the trend_submissions table to handle this better
-- First, drop the existing foreign key constraint if it exists
ALTER TABLE IF EXISTS public.trend_submissions 
  DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;

-- Add the foreign key back with CASCADE options
ALTER TABLE public.trend_submissions
  ADD CONSTRAINT trend_submissions_spotter_id_fkey 
  FOREIGN KEY (spotter_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

-- Create RLS policies for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view all profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Enable RLS on trend_submissions if not already enabled
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can delete own trend submissions" ON public.trend_submissions;

-- Create new policies
CREATE POLICY "Users can create trend submissions" ON public.trend_submissions
  FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can view all trend submissions" ON public.trend_submissions
  FOR SELECT USING (true);

CREATE POLICY "Users can update own trend submissions" ON public.trend_submissions
  FOR UPDATE USING (auth.uid() = spotter_id);

CREATE POLICY "Users can delete own trend submissions" ON public.trend_submissions
  FOR DELETE USING (auth.uid() = spotter_id);

-- Verify current user exists in profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = 'enterprise@test.com') THEN
    INSERT INTO public.profiles (id, email, username)
    SELECT id, email, 'enterprise_user'
    FROM auth.users 
    WHERE email = 'enterprise@test.com'
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE 'Profile created/verified for enterprise@test.com';
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;