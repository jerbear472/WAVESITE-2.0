-- =====================================================
-- COMPLETE FIX FOR USER PROFILES TABLE
-- =====================================================

-- Step 1: Check current table structure
DO $$
DECLARE
    col_record RECORD;
    has_user_id BOOLEAN := false;
    has_id_as_uuid BOOLEAN := false;
BEGIN
    RAISE NOTICE 'Checking current user_profiles structure...';
    
    -- Check what columns exist
    FOR col_record IN 
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles'
        ORDER BY ordinal_position
    LOOP
        RAISE NOTICE '  Column: % (%)', col_record.column_name, col_record.data_type;
        
        IF col_record.column_name = 'user_id' THEN
            has_user_id := true;
        END IF;
        
        IF col_record.column_name = 'id' AND col_record.data_type = 'uuid' THEN
            has_id_as_uuid := true;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Has user_id column: %', has_user_id;
    RAISE NOTICE 'Has id column as UUID: %', has_id_as_uuid;
END $$;

-- Step 2: Add user_id column if it doesn't exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 3: If the table uses 'id' as the user reference, copy it
UPDATE user_profiles 
SET user_id = id::UUID 
WHERE user_id IS NULL 
AND id IS NOT NULL;

-- Step 4: Add all required columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS current_balance DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS approval_rate DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS trends_submitted INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_approved INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validations_completed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Add foreign key constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_type = 'FOREIGN KEY' 
        AND table_name = 'user_profiles' 
        AND constraint_name LIKE '%user_id%'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT fk_user_profiles_user_id 
        FOREIGN KEY (user_id) REFERENCES auth.users(id);
    END IF;
END $$;

-- Step 6: Create unique constraint on user_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user_profiles' 
        AND indexname = 'user_profiles_user_id_key'
    ) THEN
        ALTER TABLE user_profiles 
        ADD CONSTRAINT user_profiles_user_id_key UNIQUE (user_id);
        RAISE NOTICE 'Added unique constraint on user_id';
    ELSE
        RAISE NOTICE 'Unique constraint on user_id already exists';
    END IF;
END $$;

-- Step 7: Add check constraint for performance_tier
ALTER TABLE user_profiles 
DROP CONSTRAINT IF EXISTS user_profiles_performance_tier_check;

ALTER TABLE user_profiles 
ADD CONSTRAINT user_profiles_performance_tier_check 
CHECK (performance_tier IN ('restricted', 'learning', 'verified', 'elite', 'master'));

-- Step 8: Create test user profile (without ON CONFLICT since we just added the constraint)
DO $$
BEGIN
    -- Check if test user exists
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles 
        WHERE user_id = '00000000-0000-0000-0000-000000000001'
    ) THEN
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
        );
        RAISE NOTICE 'Created test user profile';
    ELSE
        RAISE NOTICE 'Test user already exists';
    END IF;
END $$;

-- Step 9: Verify the structure
DO $$
DECLARE
    col_count INTEGER;
    user_count INTEGER;
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'user_profiles';
    
    SELECT COUNT(*) INTO user_count
    FROM user_profiles;
    
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints
    WHERE table_name = 'user_profiles';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ USER PROFILES TABLE FIXED:';
    RAISE NOTICE '   • Columns: %', col_count;
    RAISE NOTICE '   • Users: %', user_count;
    RAISE NOTICE '   • Constraints: %', constraint_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Table is ready for use with earnings system!';
END $$;