-- Fix user_profiles table permissions for registration

-- First, add a policy that allows users to insert their own profile
CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles
FOR INSERT 
WITH CHECK (auth.uid() = id);

-- Alternative: If the trigger doesn't work, remove it and handle profile creation manually
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Make sure the function exists and works properly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, username, role)
    VALUES (
        new.id, 
        new.email,
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
        'participant'
    );
    RETURN new;
EXCEPTION 
    WHEN unique_violation THEN
        -- Profile already exists, ignore
        RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;

-- Make sure the RLS policies are correct
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- View all current policies
SELECT * FROM pg_policies WHERE tablename = 'user_profiles';