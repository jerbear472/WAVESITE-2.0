-- Check which tables might be missing user_id column
-- First check trend_validations structure
SELECT 
    'trend_validations' as table_name,
    column_name,
    data_type
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'trend_validations'
    AND column_name IN ('user_id', 'validator_id')

UNION ALL

-- Check earnings_ledger structure  
SELECT 
    'earnings_ledger' as table_name,
    column_name,
    data_type
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'earnings_ledger'
    AND column_name = 'user_id'

UNION ALL

-- Check captured_trends structure
SELECT 
    'captured_trends' as table_name,
    column_name,
    data_type
FROM 
    information_schema.columns 
WHERE 
    table_schema = 'public' 
    AND table_name = 'captured_trends'
    AND column_name = 'user_id';

-- If trend_validations is missing validator_id, rename user_id to validator_id
DO $$ 
BEGIN
    -- Check if trend_validations has user_id but not validator_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'validator_id'
    ) THEN
        -- Rename the column
        ALTER TABLE public.trend_validations 
        RENAME COLUMN user_id TO validator_id;
        
        RAISE NOTICE 'Renamed user_id to validator_id in trend_validations table';
    END IF;
END $$;
