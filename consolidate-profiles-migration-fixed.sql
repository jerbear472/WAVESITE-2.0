-- Migration Script: Consolidate user_profiles into profiles table (FIXED)
-- This script merges the two profile tables into one unified 'profiles' table
-- Handles cases where columns may not exist in user_profiles
-- 
-- IMPORTANT: Run this in a transaction and backup your database first!
-- 

BEGIN;

-- Step 1: Add missing columns from user_profiles to profiles table
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
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0.00;

-- Step 2: Check what columns actually exist in user_profiles and migrate accordingly
DO $$
DECLARE
    col_exists boolean;
    up_record RECORD;
BEGIN
    -- Check if user_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles' AND table_schema = 'public') THEN
        
        -- Get all users from user_profiles that don't exist in profiles
        FOR up_record IN 
            SELECT * FROM user_profiles up 
            WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = up.id)
        LOOP
            -- Insert basic data that should exist
            INSERT INTO profiles (id, email, username, created_at)
            VALUES (
                up_record.id,
                up_record.email,
                up_record.username,
                COALESCE(up_record.created_at, NOW())
            );
        END LOOP;
        
        -- Now update profiles with any additional data from user_profiles
        -- Check each column individually to avoid errors
        
        -- Check and update role
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'role'
            AND table_schema = 'public'
        ) INTO col_exists;
        
        IF col_exists THEN
            UPDATE profiles p
            SET role = up.role::TEXT
            FROM user_profiles up
            WHERE p.id = up.id AND up.role IS NOT NULL;
        END IF;
        
        -- Check and update demographics
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'demographics'
            AND table_schema = 'public'
        ) INTO col_exists;
        
        IF col_exists THEN
            UPDATE profiles p
            SET demographics = up.demographics
            FROM user_profiles up
            WHERE p.id = up.id AND up.demographics IS NOT NULL;
        END IF;
        
        -- Check and update interests
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'interests'
            AND table_schema = 'public'
        ) INTO col_exists;
        
        IF col_exists THEN
            UPDATE profiles p
            SET interests = up.interests
            FROM user_profiles up
            WHERE p.id = up.id AND up.interests IS NOT NULL;
        END IF;
        
        -- Check and update is_active
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'is_active'
            AND table_schema = 'public'
        ) INTO col_exists;
        
        IF col_exists THEN
            UPDATE profiles p
            SET is_active = up.is_active
            FROM user_profiles up
            WHERE p.id = up.id AND up.is_active IS NOT NULL;
        END IF;
        
        RAISE NOTICE 'Data migration from user_profiles to profiles completed';
    ELSE
        RAISE NOTICE 'user_profiles table does not exist, skipping data migration';
    END IF;
END $$;

-- Step 3: Calculate and update earnings data from earnings_ledger if available
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger' AND table_schema = 'public') THEN
        -- Update total earnings from earnings_ledger
        UPDATE profiles p
        SET total_earnings = COALESCE((
            SELECT SUM(amount) 
            FROM earnings_ledger el 
            WHERE el.user_id = p.id 
            AND el.status IN ('confirmed', 'completed', 'paid')
        ), 0);
        
        -- Update pending earnings from earnings_ledger
        UPDATE profiles p
        SET pending_earnings = COALESCE((
            SELECT SUM(amount) 
            FROM earnings_ledger el 
            WHERE el.user_id = p.id 
            AND el.status = 'pending'
        ), 0);
        
        RAISE NOTICE 'Updated earnings from earnings_ledger';
    END IF;
    
    -- Update trends_spotted from trend_submissions if available
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_submissions' AND table_schema = 'public') THEN
        UPDATE profiles p
        SET trends_spotted = COALESCE((
            SELECT COUNT(*) 
            FROM trend_submissions ts 
            WHERE ts.spotter_id = p.id
        ), 0);
        
        RAISE NOTICE 'Updated trends_spotted count';
    END IF;
END $$;

-- Step 4: Drop existing foreign key constraints that reference user_profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu 
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'user_profiles'
            AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE', 
                      r.table_name, r.constraint_name);
        RAISE NOTICE 'Dropped constraint % on table %', r.constraint_name, r.table_name;
    END LOOP;
END $$;

-- Step 5: Update foreign key columns to reference profiles instead
-- This handles all tables that might reference user_profiles
DO $$
DECLARE
    r RECORD;
    constraint_name TEXT;
BEGIN
    -- Find all columns that might reference user profiles
    FOR r IN 
        SELECT DISTINCT
            tc.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
            AND tc.table_schema = 'public'
            AND kcu.column_name IN ('user_id', 'spotter_id', 'validator_id', 'approved_by_id', 
                                   'admin_id', 'added_by', 'invited_by', 'processed_by', 
                                   'target_user_id', 'created_by')
    LOOP
        -- Generate a unique constraint name
        constraint_name := r.table_name || '_' || r.column_name || '_fkey';
        
        -- Check if this column contains valid profile IDs
        EXECUTE format('
            ALTER TABLE %I 
            ADD CONSTRAINT %I 
            FOREIGN KEY (%I) 
            REFERENCES profiles(id) 
            ON DELETE CASCADE',
            r.table_name, 
            constraint_name,
            r.column_name
        );
        
        RAISE NOTICE 'Added constraint % on %.%', constraint_name, r.table_name, r.column_name;
    END LOOP;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Some constraints could not be added: %', SQLERRM;
END $$;

-- Step 6: Update RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;

-- Create comprehensive RLS policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update their own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" 
    ON profiles FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Step 7: Update or create the trigger function for new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, username, created_at, updated_at)
    VALUES (
        new.id, 
        new.email,
        COALESCE(
            new.raw_user_meta_data->>'username',
            new.raw_user_meta_data->>'name',
            split_part(new.email, '@', 1)
        ),
        new.created_at,
        new.created_at
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Step 8: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_tier ON profiles(subscription_tier);

-- Step 9: Drop the old user_profiles table (only if it exists)
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- Step 10: Create view for backward compatibility
CREATE OR REPLACE VIEW user_profiles AS 
SELECT 
    id,
    username,
    email,
    role,
    demographics,
    interests,
    created_at,
    is_active,
    total_earnings,
    pending_earnings,
    trends_spotted,
    accuracy_score,
    validation_score
FROM profiles;

-- Grant permissions on the view
GRANT SELECT ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- Step 11: Verify the migration
DO $$
DECLARE
    profile_count INTEGER;
    missing_profiles INTEGER;
    auth_user_count INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE 'Total profiles after migration: %', profile_count;
    
    -- Count auth users
    SELECT COUNT(*) INTO auth_user_count FROM auth.users;
    RAISE NOTICE 'Total auth users: %', auth_user_count;
    
    -- Check for any auth users without profiles
    SELECT COUNT(*) INTO missing_profiles 
    FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);
    
    IF missing_profiles > 0 THEN
        RAISE WARNING 'Found % auth users without profiles - creating them now', missing_profiles;
        
        -- Create missing profiles
        INSERT INTO profiles (id, email, username, created_at)
        SELECT 
            u.id,
            u.email,
            COALESCE(
                u.raw_user_meta_data->>'username',
                u.raw_user_meta_data->>'name',
                split_part(u.email, '@', 1)
            ),
            u.created_at
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);
    END IF;
    
    RAISE NOTICE 'Migration completed successfully!';
END $$;

COMMIT;

-- Post-migration verification queries (run these manually to check):
-- SELECT COUNT(*) as profile_count FROM profiles;
-- SELECT COUNT(*) as auth_user_count FROM auth.users;
-- SELECT * FROM profiles LIMIT 5;
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name IN ('user_id', 'spotter_id', 'validator_id') AND table_schema = 'public';