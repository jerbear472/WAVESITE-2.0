-- Check current trend_submissions table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Add payment_amount column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'trend_submissions'
        AND column_name = 'payment_amount'
    ) THEN
        ALTER TABLE trend_submissions
        ADD COLUMN payment_amount DECIMAL(10, 2) DEFAULT 0.00;
        
        RAISE NOTICE 'Added payment_amount column to trend_submissions table';
    ELSE
        RAISE NOTICE 'payment_amount column already exists in trend_submissions table';
    END IF;
END $$;

-- Update existing records to have a default payment amount based on trend type
-- This ensures consistency with the earnings system
UPDATE trend_submissions
SET payment_amount = CASE
    WHEN status = 'approved' THEN 10.00  -- Default approved trend payment
    WHEN status = 'pending' THEN 0.00    -- No payment for pending
    ELSE 0.00
END
WHERE payment_amount IS NULL;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
AND column_name = 'payment_amount';

-- Check if there are any related earnings functions that need the payment_amount
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND (routine_name LIKE '%trend%' OR routine_name LIKE '%earning%' OR routine_name LIKE '%payment%')
ORDER BY routine_name;