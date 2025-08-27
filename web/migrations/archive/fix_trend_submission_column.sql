-- Check if trend_submissions has user_id column
DO $$ 
BEGIN
    -- Check if user_id column doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND column_name = 'user_id'
    ) THEN
        -- Add user_id as a computed column that references spotter_id
        -- This allows triggers to work with both column names
        ALTER TABLE public.trend_submissions 
        ADD COLUMN user_id UUID GENERATED ALWAYS AS (spotter_id) STORED;
        
        RAISE NOTICE 'Added user_id as computed column referencing spotter_id in trend_submissions table';
    END IF;
END $$;

-- Display the columns to verify
SELECT column_name, data_type, is_generated
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('user_id', 'spotter_id');
