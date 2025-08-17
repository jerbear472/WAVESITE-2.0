-- COMPLETE FIX FOR EARNINGS_LEDGER TABLE
-- Run this in Supabase SQL Editor

-- 1. Create the table if it doesn't exist
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_id ON earnings_ledger(trend_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON earnings_ledger(created_at DESC);

-- 3. Enable Row Level Security
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- 4. Drop all existing policies (to start fresh)
DROP POLICY IF EXISTS "Users can view their own earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "Users can insert their own earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "System can insert earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "System can update earnings" ON earnings_ledger;
DROP POLICY IF EXISTS "Service role full access" ON earnings_ledger;

-- 5. Create new comprehensive policies
-- Allow users to see their own earnings
CREATE POLICY "Users can view their own earnings" ON earnings_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to insert their own earnings
CREATE POLICY "Users can insert their own earnings" ON earnings_ledger
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own earnings (for status changes)
CREATE POLICY "Users can update their own earnings" ON earnings_ledger
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Service role has full access (for backend operations)
CREATE POLICY "Service role full access" ON earnings_ledger
    FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role');

-- 6. Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON earnings_ledger TO service_role;
GRANT ALL ON earnings_ledger TO anon; -- For public read if needed

-- 7. Test the table by checking its structure
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns
WHERE table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- 8. Check if any data exists
SELECT COUNT(*) as total_records FROM earnings_ledger;

-- 9. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'earnings_ledger';

-- 10. Insert a test record (replace with actual user_id)
-- Uncomment and modify this to test:
-- INSERT INTO earnings_ledger (user_id, amount, type, status, description)
-- VALUES ('YOUR_USER_ID_HERE', 0.25, 'test', 'pending', 'Test entry - delete me')
-- RETURNING *;