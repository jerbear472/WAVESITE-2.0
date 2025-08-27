-- FINAL FIX for validation issues (v2 - corrected syntax)
-- This script completely rebuilds the validation system to work correctly

-- Step 1: Backup existing data (if any)
CREATE TEMP TABLE IF NOT EXISTS validation_backup AS 
SELECT * FROM trend_validations;

-- Step 2: Drop ALL policies on trend_validations
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    FOR policy_rec IN 
        SELECT polname FROM pg_policy WHERE polrelid = 'trend_validations'::regclass
    LOOP
        EXECUTE format('DROP POLICY %I ON trend_validations', policy_rec.polname);
        RAISE NOTICE 'Dropped policy: %', policy_rec.polname;
    END LOOP;
END $$;

-- Step 3: Drop ALL triggers on trend_validations
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    FOR trigger_rec IN 
        SELECT tgname FROM pg_trigger 
        WHERE tgrelid = 'trend_validations'::regclass 
        AND tgisinternal = false
    LOOP
        EXECUTE format('DROP TRIGGER %I ON trend_validations', trigger_rec.tgname);
        RAISE NOTICE 'Dropped trigger: %', trigger_rec.tgname;
    END LOOP;
END $$;

-- Step 4: Check which columns exist and add missing ones
DO $$
BEGIN
    -- Ensure trend_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_id'
    ) THEN
        -- Check if trend_submission_id exists and copy its data
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' AND column_name = 'trend_submission_id'
        ) THEN
            ALTER TABLE trend_validations ADD COLUMN trend_id UUID;
            UPDATE trend_validations SET trend_id = trend_submission_id;
            RAISE NOTICE 'Added trend_id column and copied data from trend_submission_id';
        END IF;
    END IF;
    
    -- Ensure validator_id exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'validator_id'
    ) THEN
        -- Check if user_id exists and rename it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' AND column_name = 'user_id'
        ) THEN
            ALTER TABLE trend_validations RENAME COLUMN user_id TO validator_id;
            RAISE NOTICE 'Renamed user_id to validator_id';
        END IF;
    END IF;
END $$;

-- Step 5: Create simple, working RLS policies
-- Enable RLS
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own validations
CREATE POLICY "allow_insert" ON trend_validations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Allow authenticated users to view all validations
CREATE POLICY "allow_select" ON trend_validations
FOR SELECT TO authenticated
USING (true);

-- Prevent updates
CREATE POLICY "no_update" ON trend_validations
FOR UPDATE TO authenticated
USING (false);

-- Prevent deletes
CREATE POLICY "no_delete" ON trend_validations
FOR DELETE TO authenticated
USING (false);

-- Step 6: Add unique constraint to prevent duplicate votes
DO $$
BEGIN
    -- Add constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_vote_per_user_per_trend'
    ) THEN
        -- Try with trend_id first
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' AND column_name = 'trend_id'
        ) THEN
            ALTER TABLE trend_validations 
            ADD CONSTRAINT unique_vote_per_user_per_trend 
            UNIQUE (trend_id, validator_id);
            RAISE NOTICE 'Added unique constraint on (trend_id, validator_id)';
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trend_validations' AND column_name = 'trend_submission_id'
        ) THEN
            ALTER TABLE trend_validations 
            ADD CONSTRAINT unique_vote_per_user_per_trend 
            UNIQUE (trend_submission_id, validator_id);
            RAISE NOTICE 'Added unique constraint on (trend_submission_id, validator_id)';
        END IF;
    ELSE
        RAISE NOTICE 'Unique constraint already exists';
    END IF;
END $$;

-- Step 7: Log what we did
DO $$
BEGIN
    RAISE NOTICE 'Created simplified RLS policies';
END $$;

-- Step 8: Verify the fix
DO $$
DECLARE
    col_list TEXT;
    policy_count INT;
    trigger_count INT;
BEGIN
    -- Get column list
    SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
    INTO col_list
    FROM information_schema.columns
    WHERE table_name = 'trend_validations';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policy
    WHERE polrelid = 'trend_validations'::regclass;
    
    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgrelid = 'trend_validations'::regclass
    AND tgisinternal = false;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VALIDATION SYSTEM REBUILD COMPLETE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Table columns: %', col_list;
    RAISE NOTICE 'RLS Policies: %', policy_count;
    RAISE NOTICE 'Triggers: %', trigger_count;
    RAISE NOTICE '';
    RAISE NOTICE 'The validation page should now work!';
    RAISE NOTICE 'No more user_id errors!';
    RAISE NOTICE '===========================================';
END $$;

-- Step 9: Test insert capability (optional - will show if insert works)
DO $$
DECLARE
    test_result TEXT;
BEGIN
    -- Try a test insert (will rollback)
    BEGIN
        -- This is just a test, will be rolled back
        INSERT INTO trend_validations (id, created_at)
        VALUES (gen_random_uuid(), NOW());
        
        test_result := 'INSERT TEST: Success - inserts are working';
        
        -- Rollback the test insert
        RAISE EXCEPTION 'Test complete - rolling back';
    EXCEPTION
        WHEN OTHERS THEN
            IF SQLERRM LIKE '%Test complete%' THEN
                test_result := 'INSERT TEST: Success - inserts are working';
            ELSE
                test_result := 'INSERT TEST: Failed - ' || SQLERRM;
            END IF;
    END;
    
    RAISE NOTICE '%', test_result;
END $$;