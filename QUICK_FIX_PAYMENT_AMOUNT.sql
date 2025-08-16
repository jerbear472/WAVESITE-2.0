-- Quick fix for payment_amount column error
-- Run this immediately to fix the trend submission error

-- Add payment_amount column to trend_submissions if it doesn't exist
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
        
        RAISE NOTICE '✅ Added payment_amount column to trend_submissions table';
    ELSE
        RAISE NOTICE '✓ payment_amount column already exists in trend_submissions table';
    END IF;
END $$;

-- Also add to captured_trends if that table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'captured_trends') THEN
        
        IF NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = 'captured_trends'
            AND column_name = 'payment_amount'
        ) THEN
            ALTER TABLE captured_trends
            ADD COLUMN payment_amount DECIMAL(10, 2) DEFAULT 0.00;
            
            RAISE NOTICE '✅ Added payment_amount column to captured_trends table';
        ELSE
            RAISE NOTICE '✓ payment_amount column already exists in captured_trends table';
        END IF;
    END IF;
END $$;

-- Verify the columns were added
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE column_name = 'payment_amount'
AND table_name IN ('trend_submissions', 'captured_trends')
ORDER BY table_name;