-- Check what columns exist in user_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- If the primary key is 'id' but we need 'user_id', let's check
-- First see if user_id column exists
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
    ) THEN
        -- Check if id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_profiles' 
            AND column_name = 'id'
        ) THEN
            -- Rename id to user_id for consistency
            ALTER TABLE user_profiles RENAME COLUMN id TO user_id;
            RAISE NOTICE 'Renamed column id to user_id in user_profiles table';
        END IF;
    END IF;
END $$;

-- Ensure all necessary columns exist
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS session_streak INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS trends_spotted INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- If there's a constraint on id that needs to be moved to user_id
DO $$
BEGIN
    -- Drop old primary key if it exists on 'id'
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name != 'user_profiles_user_id_pkey'
    ) THEN
        ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_pkey;
    END IF;
    
    -- Add primary key on user_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'user_profiles' 
        AND constraint_type = 'PRIMARY KEY'
        AND constraint_name = 'user_profiles_user_id_pkey'
    ) THEN
        ALTER TABLE user_profiles ADD CONSTRAINT user_profiles_user_id_pkey PRIMARY KEY (user_id);
    END IF;
END $$;

-- Test to verify the structure
SELECT 
    'user_profiles structure:' as info,
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
AND column_name IN ('user_id', 'id', 'pending_earnings', 'total_earned')
ORDER BY ordinal_position;