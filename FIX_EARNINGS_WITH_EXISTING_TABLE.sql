-- FIX: Work with existing earnings_ledger table structure
-- This handles the transaction_type column that exists in your table

-- Step 1: Check the actual structure of your earnings_ledger table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- Step 2: Clear any bad/test data with null transaction_type (optional)
DELETE FROM earnings_ledger 
WHERE transaction_type IS NULL;

-- Step 3: Migrate existing trends to earnings_ledger with proper transaction_type
INSERT INTO earnings_ledger (
    user_id,
    trend_id,
    amount,
    transaction_type,  -- This column exists and is NOT NULL
    status,
    description,
    metadata,
    created_at
)
SELECT 
    ts.spotter_id as user_id,
    ts.id as trend_id,
    COALESCE(ts.payment_amount, 0.25) as amount,
    'trend_submission' as transaction_type,  -- Required field
    CASE 
        WHEN ts.status = 'approved' THEN 'approved'
        WHEN ts.status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END as status,
    CONCAT('Trend: ', COALESCE(ts.description, 'Untitled')) as description,
    jsonb_build_object(
        'category', ts.category,
        'quality_score', ts.quality_score,
        'validation_count', ts.validation_count
    ) as metadata,
    ts.created_at
FROM trend_submissions ts
WHERE NOT EXISTS (
    SELECT 1 FROM earnings_ledger el 
    WHERE el.trend_id = ts.id
)
AND ts.spotter_id IS NOT NULL;

-- Step 4: Update RLS policies to be more permissive
DROP POLICY IF EXISTS "Users can view their own earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "Users can insert their own earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "Enable read access for users" ON earnings_ledger;
DROP POLICY IF EXISTS "Enable insert for users" ON earnings_ledger;

-- Create simple policies
CREATE POLICY "Users can view their own earnings" ON earnings_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own earnings" ON earnings_ledger
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Step 5: Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON earnings_ledger TO service_role;

-- Step 6: Check how many earnings exist now
SELECT 
    'Total earnings entries' as metric,
    COUNT(*) as count
FROM earnings_ledger

UNION ALL

SELECT 
    'Earnings for current user' as metric,
    COUNT(*) as count
FROM earnings_ledger
WHERE user_id = auth.uid();

-- Step 7: Show sample earnings for current user
SELECT 
    id,
    amount,
    transaction_type,
    status,
    description,
    created_at
FROM earnings_ledger
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 10;

-- Step 8: Create or replace trigger for auto-creating earnings
CREATE OR REPLACE FUNCTION create_earnings_on_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create if not already exists
    IF NOT EXISTS (SELECT 1 FROM earnings_ledger WHERE trend_id = NEW.id) THEN
        INSERT INTO earnings_ledger (
            user_id,
            trend_id,
            amount,
            transaction_type,  -- Required field
            status,
            description,
            metadata
        ) VALUES (
            NEW.spotter_id,
            NEW.id,
            COALESCE(NEW.payment_amount, 0.25),
            'trend_submission',
            'pending',
            CONCAT('Trend: ', COALESCE(NEW.description, 'Untitled')),
            jsonb_build_object(
                'category', NEW.category,
                'quality_score', NEW.quality_score
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_earnings_on_submission ON trend_submissions;

CREATE TRIGGER create_earnings_on_submission
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_earnings_on_trend_submission();