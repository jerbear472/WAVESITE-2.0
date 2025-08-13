-- =====================================================
-- FIX EARNINGS LEDGER TABLE
-- =====================================================

-- Drop the table if it exists with wrong schema
DROP TABLE IF EXISTS earnings_ledger CASCADE;

-- Create earnings_ledger with ALL required columns
CREATE TABLE earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'trend_submission', 'validation_vote', 'approval_bonus',
        'quality_bonus', 'performance_bonus', 'tier_adjustment',
        'cashout', 'adjustment', 'referral'
    )),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL DEFAULT 0,
    balance_after DECIMAL(10,2) NOT NULL DEFAULT 0,
    reference_id UUID,
    reference_type TEXT, -- THIS WAS MISSING!
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_earnings_user_date ON earnings_ledger(user_id, created_at DESC);
CREATE INDEX idx_earnings_reference ON earnings_ledger(reference_id, reference_type);

-- Enable RLS
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Grant permissions
GRANT SELECT, INSERT ON earnings_ledger TO authenticated;

-- Now run the rest of the installation
-- Continue with the INSTALL_UNIFIED_EARNINGS.sql from Step 3 onward

DO $$
BEGIN
    RAISE NOTICE 'earnings_ledger table fixed with all required columns';
END $$;