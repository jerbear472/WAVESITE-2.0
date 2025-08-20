-- =============================================
-- FIX XP TABLE RLS POLICIES
-- =============================================
-- Ensure users can read/write their own XP data
-- and triggers can insert XP records
-- =============================================

-- 1. Enable RLS on XP tables if not already enabled
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Users can insert own XP transactions" ON xp_transactions;
DROP POLICY IF EXISTS "Service can insert XP transactions" ON xp_transactions;

DROP POLICY IF EXISTS "Users can view own XP events" ON xp_events;
DROP POLICY IF EXISTS "Users can insert own XP events" ON xp_events;
DROP POLICY IF EXISTS "Service can insert XP events" ON xp_events;

DROP POLICY IF EXISTS "Users can view own XP ledger" ON xp_ledger;
DROP POLICY IF EXISTS "Users can insert own XP ledger" ON xp_ledger;
DROP POLICY IF EXISTS "Service can insert XP ledger" ON xp_ledger;

DROP POLICY IF EXISTS "Users can view own XP data" ON user_xp;
DROP POLICY IF EXISTS "Users can update own XP data" ON user_xp;
DROP POLICY IF EXISTS "Service can update user XP" ON user_xp;

-- 3. Create policies for xp_transactions table
CREATE POLICY "Users can view own XP transactions" ON xp_transactions
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert XP transactions" ON xp_transactions
FOR INSERT WITH CHECK (true); -- Allow service/triggers to insert

-- 4. Create policies for xp_events table (new clean table)
CREATE POLICY "Users can view own XP events" ON xp_events
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert XP events" ON xp_events
FOR INSERT WITH CHECK (true); -- Allow service/triggers to insert

-- 5. Create policies for xp_ledger table
CREATE POLICY "Users can view own XP ledger" ON xp_ledger
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can insert XP ledger" ON xp_ledger
FOR INSERT WITH CHECK (true); -- Allow service/triggers to insert

-- 6. Create policies for user_xp table
CREATE POLICY "Users can view own XP data" ON user_xp
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can update user XP" ON user_xp
FOR ALL WITH CHECK (true); -- Allow service/triggers to update

-- 7. Grant necessary permissions
GRANT SELECT ON xp_transactions TO authenticated;
GRANT SELECT ON xp_events TO authenticated;
GRANT SELECT ON xp_ledger TO authenticated;
GRANT SELECT, UPDATE ON user_xp TO authenticated;

-- For service operations (triggers, functions)
GRANT INSERT ON xp_transactions TO authenticated;
GRANT INSERT ON xp_events TO authenticated;
GRANT INSERT ON xp_ledger TO authenticated;

-- 8. Ensure trend submission triggers can work
-- These functions need to be able to insert XP records
ALTER FUNCTION award_submission_xp() SECURITY DEFINER;
ALTER FUNCTION process_validation_outcome() SECURITY DEFINER;
ALTER FUNCTION process_trend_validation_outcome() SECURITY DEFINER;

-- 9. Grant execute permissions on XP functions
GRANT EXECUTE ON FUNCTION award_submission_xp() TO authenticated;
GRANT EXECUTE ON FUNCTION process_validation_outcome() TO authenticated;
GRANT EXECUTE ON FUNCTION process_trend_validation_outcome() TO authenticated;

-- 10. Create policy for trend_validations if needed (for triggers)
DROP POLICY IF EXISTS "Service can insert validations" ON trend_validations;
CREATE POLICY "Service can insert validations" ON trend_validations
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view all validations" ON trend_validations;
CREATE POLICY "Users can view all validations" ON trend_validations
FOR SELECT USING (true);

-- 11. Ensure trend_submissions can be updated by triggers
DROP POLICY IF EXISTS "Service can update trend status" ON trend_submissions;
CREATE POLICY "Service can update trend status" ON trend_submissions
FOR UPDATE WITH CHECK (true);

COMMENT ON POLICY "Service can insert XP events" ON xp_events IS 'Allows triggers and service functions to insert XP records';
COMMENT ON POLICY "Service can update user XP" ON user_xp IS 'Allows triggers to update user XP totals';
COMMENT ON POLICY "Service can update trend status" ON trend_submissions IS 'Allows triggers to update validation status';