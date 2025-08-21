-- UNIFY XP TRACKING SYSTEM
-- Problem: Code uses 3 different table names: xp_events, xp_ledger, xp_transactions
-- Solution: Standardize on xp_events as the main XP tracking table

-- First, create the unified xp_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'trend_submitted', 'trend_validated', 'validation', etc.
    xp_change INTEGER NOT NULL, -- Can be positive or negative
    description TEXT,
    reference_id UUID, -- ID of related trend, validation, etc.
    reference_type TEXT, -- 'trend_submission', 'validation', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view own XP events" ON xp_events;
DROP POLICY IF EXISTS "Service role can manage XP events" ON xp_events;
DROP POLICY IF EXISTS "System can award XP" ON xp_events;

-- Create policies
CREATE POLICY "Users can view own XP events" ON xp_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP events" ON xp_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "System can award XP" ON xp_events
    FOR INSERT WITH CHECK (true);

-- Grant permissions
GRANT ALL ON xp_events TO authenticated;
GRANT ALL ON xp_events TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_reference ON xp_events(reference_id, reference_type);

-- Migrate data from xp_ledger if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_ledger') THEN
        -- Insert data from xp_ledger into xp_events with unified structure
        INSERT INTO xp_events (user_id, event_type, xp_change, description, created_at)
        SELECT 
            user_id,
            COALESCE(transaction_type, 'legacy') as event_type,
            COALESCE(xp_amount, 0) as xp_change,
            COALESCE(description, 'Legacy XP entry') as description,
            COALESCE(created_at, NOW()) as created_at
        FROM xp_ledger
        WHERE NOT EXISTS (
            SELECT 1 FROM xp_events 
            WHERE xp_events.user_id = xp_ledger.user_id 
            AND xp_events.created_at = xp_ledger.created_at
        );
        
        RAISE NOTICE 'Migrated data from xp_ledger to xp_events';
    END IF;
END $$;

-- Migrate data from xp_transactions if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_transactions') THEN
        -- Insert data from xp_transactions into xp_events with unified structure
        INSERT INTO xp_events (user_id, event_type, xp_change, description, created_at)
        SELECT 
            user_id,
            COALESCE(type, 'legacy') as event_type,
            COALESCE(amount, 0) as xp_change,
            COALESCE(description, 'Legacy XP transaction') as description,
            COALESCE(created_at, NOW()) as created_at
        FROM xp_transactions
        WHERE NOT EXISTS (
            SELECT 1 FROM xp_events 
            WHERE xp_events.user_id = xp_transactions.user_id 
            AND xp_events.created_at = xp_transactions.created_at
        );
        
        RAISE NOTICE 'Migrated data from xp_transactions to xp_events';
    END IF;
END $$;

-- Create compatibility views for backward compatibility
-- This allows existing code to still work while we transition

-- Create xp_ledger view that maps to xp_events
DROP VIEW IF EXISTS xp_ledger;
CREATE VIEW xp_ledger AS
SELECT 
    id,
    user_id,
    xp_change as xp_amount,
    event_type as transaction_type,
    description,
    'approved' as status, -- Default status for compatibility
    created_at,
    updated_at
FROM xp_events;

-- Create xp_transactions view that maps to xp_events  
DROP VIEW IF EXISTS xp_transactions;
CREATE VIEW xp_transactions AS
SELECT 
    id,
    user_id,
    xp_change as amount,
    event_type as type,
    description,
    created_at,
    updated_at
FROM xp_events;

-- Grant access to the compatibility views
GRANT SELECT ON xp_ledger TO authenticated;
GRANT SELECT ON xp_transactions TO authenticated;
GRANT INSERT ON xp_ledger TO authenticated;
GRANT INSERT ON xp_transactions TO authenticated;

-- Update the award_xp function to use xp_events consistently
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    -- Insert or update user_xp
    INSERT INTO user_xp (user_id, total_xp, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;

    -- Create XP event record in the unified table
    INSERT INTO xp_events (
        user_id,
        event_type,
        xp_change,
        description,
        reference_id,
        reference_type
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        COALESCE(p_description, p_type || ' +' || p_amount || ' XP'),
        p_reference_id,
        p_reference_type
    );

    RETURN v_new_total;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, TEXT, UUID, TEXT) TO authenticated;

RAISE NOTICE 'XP tables unified! All XP tracking now uses xp_events table with compatibility views.';
RAISE NOTICE 'Existing code using xp_ledger or xp_transactions will continue to work.';