-- Create earnings_ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL, -- 'trend_submission', 'validation', 'bonus', etc.
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_id ON earnings_ledger(trend_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON earnings_ledger(created_at DESC);

-- Enable RLS
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own earnings" ON earnings_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert earnings" ON earnings_ledger
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update earnings" ON earnings_ledger
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON earnings_ledger TO service_role;

-- Verify table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'earnings_ledger'
ORDER BY ordinal_position;