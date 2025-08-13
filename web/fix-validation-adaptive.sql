-- Adaptive fix for the trend_validations table
-- This script checks what columns exist and creates the appropriate function

-- First, let's check what columns we have
DO $$
DECLARE
    has_trend_id boolean := false;
    has_trend_submission_id boolean := false;
    has_validator_id boolean := false;
    has_user_id boolean := false;
    trend_col_name text;
    validator_col_name text;
BEGIN
    -- Check which columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_id'
    ) INTO has_trend_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_submission_id'
    ) INTO has_trend_submission_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'validator_id'
    ) INTO has_validator_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'user_id'
    ) INTO has_user_id;
    
    -- Determine the correct column names
    IF has_trend_id THEN
        trend_col_name := 'trend_id';
    ELSIF has_trend_submission_id THEN
        trend_col_name := 'trend_submission_id';
    ELSE
        RAISE EXCEPTION 'Neither trend_id nor trend_submission_id column found in trend_validations table';
    END IF;
    
    IF has_validator_id THEN
        validator_col_name := 'validator_id';
    ELSIF has_user_id THEN
        validator_col_name := 'user_id';
    ELSE
        RAISE EXCEPTION 'Neither validator_id nor user_id column found in trend_validations table';
    END IF;
    
    RAISE NOTICE 'Using columns: % for trend reference, % for validator reference', trend_col_name, validator_col_name;
END $$;

-- Alternative: Add missing columns if they don't exist
-- This is safer than renaming columns

-- Add trend_id if it doesn't exist but trend_submission_id does
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_submission_id'
    ) THEN
        -- Add trend_id as an alias/duplicate of trend_submission_id
        ALTER TABLE trend_validations ADD COLUMN IF NOT EXISTS trend_id UUID;
        UPDATE trend_validations SET trend_id = trend_submission_id WHERE trend_id IS NULL;
        RAISE NOTICE 'Added trend_id column as alias for trend_submission_id';
    END IF;
END $$;

-- Add trend_submission_id if it doesn't exist but trend_id does
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_submission_id'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' AND column_name = 'trend_id'
    ) THEN
        -- Add trend_submission_id as an alias/duplicate of trend_id
        ALTER TABLE trend_validations ADD COLUMN IF NOT EXISTS trend_submission_id UUID;
        UPDATE trend_validations SET trend_submission_id = trend_id WHERE trend_submission_id IS NULL;
        RAISE NOTICE 'Added trend_submission_id column as alias for trend_id';
    END IF;
END $$;