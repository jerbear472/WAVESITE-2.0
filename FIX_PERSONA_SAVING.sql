-- FIX PERSONA SAVING ISSUE
-- This script ensures the user_personas table exists and has proper permissions

BEGIN;

-- ============================================
-- STEP 1: CREATE TABLE IF NOT EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS user_personas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    
    -- Location data
    location_country TEXT,
    location_city TEXT,
    location_urban_type TEXT CHECK (location_urban_type IN ('urban', 'suburban', 'rural')),
    
    -- Demographics
    age_range TEXT,
    gender TEXT,
    education_level TEXT,
    relationship_status TEXT,
    has_children BOOLEAN DEFAULT false,
    
    -- Professional
    employment_status TEXT,
    industry TEXT,
    income_range TEXT,
    work_style TEXT CHECK (work_style IN ('office', 'remote', 'hybrid')),
    
    -- Arrays for interests, habits, etc.
    interests TEXT[],
    shopping_habits TEXT[],
    media_consumption TEXT[],
    values TEXT[],
    
    -- Technology
    tech_proficiency TEXT CHECK (tech_proficiency IN ('basic', 'intermediate', 'advanced', 'expert')),
    primary_devices TEXT[],
    social_platforms TEXT[],
    
    -- Metadata
    is_complete BOOLEAN DEFAULT false,
    completion_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- STEP 2: ENABLE RLS
-- ============================================

ALTER TABLE user_personas ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 3: DROP AND RECREATE ALL POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own persona" ON user_personas;
DROP POLICY IF EXISTS "Users can insert their own persona" ON user_personas;
DROP POLICY IF EXISTS "Users can update their own persona" ON user_personas;
DROP POLICY IF EXISTS "Users can delete their own persona" ON user_personas;
DROP POLICY IF EXISTS "Enable all for users on user_personas" ON user_personas;

-- Create comprehensive policies
CREATE POLICY "Enable all for users on user_personas" ON user_personas
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- STEP 4: GRANT PERMISSIONS
-- ============================================

GRANT ALL ON user_personas TO authenticated;
GRANT ALL ON user_personas TO anon; -- For upsert operations before auth completes
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- ============================================
-- STEP 5: CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_personas_user_id ON user_personas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_personas_updated_at ON user_personas(updated_at);

-- ============================================
-- STEP 6: CREATE UPDATE TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_personas_updated_at ON user_personas;
CREATE TRIGGER update_user_personas_updated_at 
    BEFORE UPDATE ON user_personas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 7: VERIFY SETUP
-- ============================================

-- Check if table exists
SELECT 
    'Table exists' as check_type,
    EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_personas'
    ) as result;

-- Check RLS status
SELECT 
    'RLS enabled' as check_type,
    rowsecurity as result
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'user_personas';

-- Check policies
SELECT 
    'Policy' as type,
    policyname as name,
    cmd as operation
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_personas';

-- Check permissions
SELECT 
    'Permission' as type,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'public' 
AND table_name = 'user_personas'
AND grantee IN ('authenticated', 'anon');

COMMIT;

-- ============================================
-- TESTING (Run separately after commit)
-- ============================================

-- Test insert (replace with actual user ID)
-- INSERT INTO user_personas (
--     user_id,
--     location_country,
--     location_city,
--     age_range,
--     interests
-- ) VALUES (
--     auth.uid(),
--     'Test Country',
--     'Test City', 
--     '25-34',
--     ARRAY['tech', 'music']
-- )
-- ON CONFLICT (user_id) 
-- DO UPDATE SET
--     location_country = EXCLUDED.location_country,
--     location_city = EXCLUDED.location_city,
--     age_range = EXCLUDED.age_range,
--     interests = EXCLUDED.interests,
--     updated_at = NOW();

-- Verify data
-- SELECT * FROM user_personas WHERE user_id = auth.uid();