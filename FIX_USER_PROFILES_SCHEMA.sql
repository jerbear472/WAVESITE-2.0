-- =====================================================
-- FIX USER PROFILES SCHEMA
-- =====================================================

-- First, let's see what columns exist
DO $$
DECLARE
    col_name TEXT;
BEGIN
    RAISE NOTICE 'Current user_profiles columns:';
    FOR col_name IN 
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  • %', col_name;
    END LOOP;
END $$;

-- Check if user_id column exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
    ) THEN
        -- If no user_id column, add it
        ALTER TABLE user_profiles ADD COLUMN user_id UUID REFERENCES auth.users(id);
        RAISE NOTICE 'Added user_id column to user_profiles';
        
        -- If there's an 'id' column that's the user reference, copy it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'id'
        ) THEN
            UPDATE user_profiles SET user_id = id WHERE user_id IS NULL;
            RAISE NOTICE 'Copied id to user_id column';
        END IF;
    ELSE
        RAISE NOTICE 'user_id column already exists';
    END IF;
END $$;

-- Ensure all required columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning' CHECK (performance_tier IN ('restricted', 'learning', 'verified', 'elite', 'master')),
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create a test user profile if none exist
INSERT INTO user_profiles (
    user_id,
    username,
    email,
    performance_tier,
    current_balance,
    total_earned
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'test_user',
    'test@wavesight.com',
    'learning',
    0.00,
    0.00
) ON CONFLICT (user_id) DO NOTHING;

-- Final verification
DO $$
DECLARE
    col_count INTEGER;
    user_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles';
    
    SELECT COUNT(*) INTO user_count
    FROM user_profiles;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ User profiles table fixed:';
    RAISE NOTICE '   • Columns: %', col_count;
    RAISE NOTICE '   • Users: %', user_count;
    RAISE NOTICE '';
END $$;