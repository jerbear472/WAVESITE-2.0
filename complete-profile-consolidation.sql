-- Complete Profile Consolidation Script
-- This removes the user_profiles view and ensures everything uses the profiles table

BEGIN;

-- Step 1: Check what user_profiles actually is
DO $$
DECLARE
    obj_type TEXT;
BEGIN
    SELECT table_type INTO obj_type
    FROM information_schema.tables
    WHERE table_name = 'user_profiles'
    AND table_schema = 'public';
    
    IF obj_type = 'VIEW' THEN
        RAISE NOTICE 'user_profiles is a VIEW (backward compatibility) - safe to remove';
    ELSIF obj_type = 'BASE TABLE' THEN
        RAISE EXCEPTION 'user_profiles is still a TABLE - run consolidation migration first!';
    ELSE
        RAISE NOTICE 'user_profiles does not exist or is type: %', obj_type;
    END IF;
END $$;

-- Step 2: Update any remaining references in your application code
-- List all database objects that might reference user_profiles
SELECT DISTINCT
    'Function/Procedure' as object_type,
    p.proname as object_name,
    'Contains reference to user_profiles' as note
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosrc LIKE '%user_profiles%'

UNION ALL

SELECT DISTINCT
    'View' as object_type,
    v.viewname as object_name,
    'References user_profiles' as note
FROM pg_views v
WHERE v.schemaname = 'public'
AND v.definition LIKE '%user_profiles%'
AND v.viewname != 'user_profiles'

UNION ALL

SELECT DISTINCT
    'Trigger' as object_type,
    t.tgname as object_name,
    'May reference user_profiles' as note
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public'
AND EXISTS (
    SELECT 1 FROM pg_proc p 
    WHERE p.oid = t.tgfoid 
    AND p.prosrc LIKE '%user_profiles%'
);

-- Step 3: Drop the backward compatibility view
DROP VIEW IF EXISTS user_profiles CASCADE;

-- Step 4: Ensure all necessary columns exist in profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant' CHECK (role IN ('participant', 'validator', 'manager', 'admin')),
ADD COLUMN IF NOT EXISTS demographics JSONB,
ADD COLUMN IF NOT EXISTS interests JSONB,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT,
ADD COLUMN IF NOT EXISTS instagram TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Create/update indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_earnings ON profiles(total_earnings DESC);

-- Step 6: Ensure RLS is enabled and policies are correct
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create clean RLS policies
CREATE POLICY "Anyone can view profiles" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "System can insert profiles" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id OR auth.uid() IS NULL);

-- Step 7: Update trigger function to ensure it works with profiles table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (
        id, 
        email, 
        username, 
        created_at, 
        updated_at,
        role,
        is_active
    )
    VALUES (
        new.id, 
        new.email,
        COALESCE(
            new.raw_user_meta_data->>'username',
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1)
        ),
        new.created_at,
        new.created_at,
        'participant',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Verify consolidation is complete
DO $$
DECLARE
    profile_count INTEGER;
    auth_count INTEGER;
    missing_profiles INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE 'Total profiles: %', profile_count;
    
    -- Count auth users
    SELECT COUNT(*) INTO auth_count FROM auth.users;
    RAISE NOTICE 'Total auth users: %', auth_count;
    
    -- Check for any auth users without profiles
    SELECT COUNT(*) INTO missing_profiles 
    FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);
    
    IF missing_profiles > 0 THEN
        RAISE WARNING 'Found % auth users without profiles - creating them now', missing_profiles;
        
        -- Create missing profiles
        INSERT INTO profiles (id, email, username, created_at, updated_at, role, is_active)
        SELECT 
            u.id,
            u.email,
            COALESCE(
                u.raw_user_meta_data->>'username',
                u.raw_user_meta_data->>'name',
                split_part(u.email, '@', 1)
            ),
            u.created_at,
            u.created_at,
            'participant',
            true
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);
    ELSE
        RAISE NOTICE 'All auth users have corresponding profiles ✓';
    END IF;
END $$;

-- Step 9: Final check - make sure no user_profiles table or view exists
DO $$
DECLARE
    obj_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles' 
        AND table_schema = 'public'
    ) INTO obj_exists;
    
    IF obj_exists THEN
        RAISE EXCEPTION 'user_profiles still exists - consolidation failed!';
    ELSE
        RAISE NOTICE 'Consolidation complete: user_profiles removed, only profiles table exists ✓';
    END IF;
END $$;

COMMIT;

-- Summary of what this script does:
-- 1. Verifies user_profiles is a view (not a table)
-- 2. Finds any database objects still referencing user_profiles
-- 3. Drops the backward compatibility view
-- 4. Ensures profiles table has all necessary columns
-- 5. Creates proper indexes for performance
-- 6. Sets up clean RLS policies
-- 7. Updates the trigger function for new users
-- 8. Creates any missing profile records
-- 9. Verifies consolidation is complete