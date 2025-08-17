-- Add user_id column to trend_validations if it doesn't exist
-- This column should reference the validator (same as validator_id)

DO $$ 
BEGIN
    -- Check if trend_validations exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations'
    ) THEN
        -- Check if user_id column doesn't exist but validator_id does
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_validations' 
            AND column_name = 'user_id'
        ) AND EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_validations' 
            AND column_name = 'validator_id'
        ) THEN
            -- Add user_id as an alias for validator_id
            ALTER TABLE public.trend_validations 
            ADD COLUMN user_id UUID GENERATED ALWAYS AS (validator_id) STORED;
            
            RAISE NOTICE 'Added user_id as computed column referencing validator_id in trend_validations table';
        END IF;
    END IF;
END $$;

-- Alternative: If the above doesn't work, rename validator_id to user_id
-- DO $$ 
-- BEGIN
--     IF EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_schema = 'public' 
--         AND table_name = 'trend_validations' 
--         AND column_name = 'validator_id'
--     ) AND NOT EXISTS (
--         SELECT 1 FROM information_schema.columns 
--         WHERE table_schema = 'public' 
--         AND table_name = 'trend_validations' 
--         AND column_name = 'user_id'
--     ) THEN
--         ALTER TABLE public.trend_validations 
--         RENAME COLUMN validator_id TO user_id;
--         
--         RAISE NOTICE 'Renamed validator_id to user_id in trend_validations table';
--     END IF;
-- END $$;
