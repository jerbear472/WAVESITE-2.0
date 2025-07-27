-- Create test user in Supabase Auth
-- Run this in Supabase SQL Editor to create the test user

-- First, ensure we have the profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Create a function to handle user creation in profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Now create the test user if it doesn't exist
-- Note: You'll need to use Supabase Dashboard to create auth users
-- or use the Supabase client library. This SQL creates the profile entry.

-- Create profile for the test user (assuming the auth user exists)
-- First check if the user exists in auth.users
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Try to get the test user ID
  SELECT id INTO test_user_id 
  FROM auth.users 
  WHERE email = 'enterprise@test.com' 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- User exists in auth, create profile
    INSERT INTO public.profiles (id, email, username)
    VALUES (test_user_id, 'enterprise@test.com', 'enterprise_user')
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      username = EXCLUDED.username,
      updated_at = NOW();
    
    RAISE NOTICE 'Profile created for enterprise@test.com with ID: %', test_user_id;
  ELSE
    RAISE NOTICE 'User enterprise@test.com not found in auth.users. Please create the user first through Supabase Dashboard or API.';
  END IF;
END $$;

-- Alternative: Create a temporary fix by removing the foreign key constraint
-- WARNING: Only use this as a last resort for testing
-- ALTER TABLE public.trend_submissions 
--   DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;

-- Better solution: Ensure all existing auth users have profiles
INSERT INTO public.profiles (id, email, username)
SELECT 
  id, 
  email,
  COALESCE(raw_user_meta_data->>'username', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- Verify the setup
SELECT 
  'Auth Users' as table_name,
  COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
  'Profiles' as table_name,
  COUNT(*) as count
FROM public.profiles;