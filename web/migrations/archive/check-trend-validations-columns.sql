-- Check the actual columns in the trend_validations table
-- This will help us understand the exact schema

-- Method 1: Show all columns and their types
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'trend_validations'
ORDER BY ordinal_position;

-- Method 2: Show the CREATE TABLE statement (if available)
SELECT 
    'trend_validations table structure:' as info;

-- Method 3: Quick test to see which column exists
DO $$
BEGIN
    -- Check if trend_id exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        RAISE NOTICE 'Column "trend_id" EXISTS in trend_validations table';
    ELSE
        RAISE NOTICE 'Column "trend_id" DOES NOT EXIST in trend_validations table';
    END IF;
    
    -- Check if trend_submission_id exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) THEN
        RAISE NOTICE 'Column "trend_submission_id" EXISTS in trend_validations table';
    ELSE
        RAISE NOTICE 'Column "trend_submission_id" DOES NOT EXIST in trend_validations table';
    END IF;
    
    -- Check if validator_id exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'validator_id'
    ) THEN
        RAISE NOTICE 'Column "validator_id" EXISTS in trend_validations table';
    ELSE
        RAISE NOTICE 'Column "validator_id" DOES NOT EXIST in trend_validations table';
    END IF;
    
    -- Check if user_id exists (old column name)
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'user_id'
    ) THEN
        RAISE NOTICE 'Column "user_id" EXISTS in trend_validations table (SHOULD BE validator_id)';
    END IF;
END $$;

-- Show a sample of data (if any exists) to understand the structure
SELECT * FROM trend_validations LIMIT 1;