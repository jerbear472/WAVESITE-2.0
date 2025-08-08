-- Migration Script: Consolidate user_profiles into profiles table
-- This script merges the two profile tables into one unified 'profiles' table
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

-- Step 2: Migrate data from user_profiles to profiles (if user_profiles exists and has data)
DO $$
BEGIN
    -- Check if user_profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        -- Merge data from user_profiles into profiles
        INSERT INTO profiles (
            id, 
            email, 
            username,
            role,
            demographics,
            interests,
            is_active,
            total_earnings,
            pending_earnings,
            trends_spotted,
            accuracy_score,
            validation_score,
            created_at
        )
        SELECT 
            up.id,
            up.email,
            up.username,
            up.role::TEXT,
            up.demographics,
            up.interests,
            up.is_active,
            up.total_earnings,
            up.pending_earnings,
            up.trends_spotted,
            up.accuracy_score,
            up.validation_score,
            up.created_at
        FROM user_profiles up
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = up.id
        );
        
        -- Update existing profiles with data from user_profiles
        UPDATE profiles p
        SET 
            role = COALESCE(up.role::TEXT, p.role),
            demographics = COALESCE(up.demographics, p.demographics),
            interests = COALESCE(up.interests, p.interests),
            is_active = COALESCE(up.is_active, p.is_active),
            total_earnings = GREATEST(COALESCE(up.total_earnings, 0), COALESCE(p.total_earnings, 0)),
            pending_earnings = GREATEST(COALESCE(up.pending_earnings, 0), COALESCE(p.pending_earnings, 0)),
            trends_spotted = GREATEST(COALESCE(up.trends_spotted, 0), COALESCE(p.trends_spotted, 0)),
            accuracy_score = GREATEST(COALESCE(up.accuracy_score, 0), COALESCE(p.accuracy_score, 0)),
            validation_score = GREATEST(COALESCE(up.validation_score, 0), COALESCE(p.validation_score, 0))
        FROM user_profiles up
        WHERE p.id = up.id;
    END IF;
END $$;

-- Step 3: Create temporary mapping for foreign key updates
CREATE TEMP TABLE IF NOT EXISTS fk_updates AS
SELECT 
    'recordings' as table_name,
    'user_id' as column_name
UNION ALL
SELECT 'trend_submissions', 'spotter_id'
UNION ALL
SELECT 'trend_submissions', 'approved_by_id'
UNION ALL
SELECT 'trend_validations', 'validator_id'
UNION ALL
SELECT 'payments', 'user_id'
UNION ALL
SELECT 'trend_folders', 'user_id'
UNION ALL
SELECT 'trend_folder_items', 'added_by'
UNION ALL
SELECT 'trend_folder_shares', 'user_id'
UNION ALL
SELECT 'trend_folder_shares', 'invited_by'
UNION ALL
SELECT 'trend_folder_activity', 'user_id'
UNION ALL
SELECT 'recording_sessions', 'user_id'
UNION ALL
SELECT 'captured_posts', 'user_id'
UNION ALL
SELECT 'earnings_ledger', 'user_id'
UNION ALL
SELECT 'user_achievements', 'user_id'
UNION ALL
SELECT 'user_challenge_progress', 'user_id'
UNION ALL
SELECT 'validator_performance', 'validator_id'
UNION ALL
SELECT 'user_persona_map', 'user_id'
UNION ALL
SELECT 'cashout_requests', 'user_id'
UNION ALL
SELECT 'cashout_requests', 'processed_by'
UNION ALL
SELECT 'user_activity_log', 'user_id'
UNION ALL
SELECT 'user_activity_log', 'target_user_id'
UNION ALL
SELECT 'access_controls', 'admin_id'
UNION ALL
SELECT 'access_controls', 'user_id';

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
    END LOOP;
END $$;

-- Step 5: Add new foreign key constraints to reference profiles table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT DISTINCT table_name, column_name FROM fk_updates
    LOOP
        -- Check if the table and column exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = r.table_name 
            AND column_name = r.column_name
            AND table_schema = 'public'
        ) THEN
            -- Add the foreign key constraint
            EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES profiles(id) ON DELETE CASCADE',
                          r.table_name, 
                          r.table_name || '_' || r.column_name || '_fkey',
                          r.column_name);
        END IF;
    END LOOP;
END $$;

-- Step 6: Update RLS policies to reference profiles instead of user_profiles
-- Drop old policies on profiles if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

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

-- Step 10: Create views for backward compatibility (optional)
-- This helps if your application code still references user_profiles
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

-- Step 11: Update any stored procedures or functions that reference user_profiles
-- This would need to be done based on your specific functions

-- Step 12: Verify the migration
DO $$
DECLARE
    profile_count INTEGER;
    missing_profiles INTEGER;
BEGIN
    -- Count profiles
    SELECT COUNT(*) INTO profile_count FROM profiles;
    RAISE NOTICE 'Total profiles after migration: %', profile_count;
    
    -- Check for any auth users without profiles
    SELECT COUNT(*) INTO missing_profiles 
    FROM auth.users u 
    WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);
    
    IF missing_profiles > 0 THEN
        RAISE WARNING 'Found % auth users without profiles', missing_profiles;
    END IF;
END $$;

COMMIT;

-- Post-migration notes:
-- 1. Update your application code to use 'profiles' instead of 'user_profiles'
-- 2. The view 'user_profiles' provides backward compatibility but should be phased out
-- 3. Test all functionality that involves user profiles
-- 4. Monitor for any errors related to profile access