-- Fix user_id column issues across all tables
-- This adds user_id as an alias/computed column where it's missing

-- 1. Fix earnings_ledger table (if user_id doesn't exist)
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'earnings_ledger' 
        AND column_name = 'user_id'
    ) THEN
        -- Check if there's another column we should use (like spotter_id or id)
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'earnings_ledger' 
            AND column_name = 'spotter_id'
        ) THEN
            -- Rename spotter_id to user_id
            ALTER TABLE earnings_ledger RENAME COLUMN spotter_id TO user_id;
        ELSE
            -- Add user_id column if it doesn't exist at all
            ALTER TABLE earnings_ledger ADD COLUMN user_id UUID REFERENCES auth.users(id);
        END IF;
    END IF;
END $$;

-- 2. Fix user_profiles table (if user_id doesn't exist)
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_profiles' 
        AND column_name = 'user_id'
    ) THEN
        -- The 'id' column should be the user_id (references auth.users.id)
        -- Add user_id as a generated column that references id
        ALTER TABLE user_profiles 
        ADD COLUMN user_id UUID GENERATED ALWAYS AS (id) STORED;
    END IF;
END $$;

-- 3. Fix trend_submissions table (if user_id doesn't exist)
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trend_submissions' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id as a generated column that references spotter_id
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'trend_submissions' 
            AND column_name = 'spotter_id'
        ) THEN
            ALTER TABLE trend_submissions 
            ADD COLUMN user_id UUID GENERATED ALWAYS AS (spotter_id) STORED;
        END IF;
    END IF;
END $$;

-- 4. Fix captured_trends table (if user_id doesn't exist)
DO $$
BEGIN
    -- Check if user_id column exists
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'captured_trends' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id column if it doesn't exist
        ALTER TABLE captured_trends ADD COLUMN user_id UUID REFERENCES auth.users(id);
    END IF;
END $$;

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_user_id ON trend_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_captured_trends_user_id ON captured_trends(user_id);

-- Display results
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name IN ('earnings_ledger', 'user_profiles', 'trend_submissions', 'captured_trends')
    AND column_name IN ('user_id', 'spotter_id', 'id')
ORDER BY table_name, column_name;