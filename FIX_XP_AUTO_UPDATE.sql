-- =====================================================
-- FIX XP AUTO-UPDATE SYSTEM
-- Ensures user_xp is automatically updated when XP is awarded
-- =====================================================

BEGIN;

-- 1. Create or replace function to update user_xp when xp_transactions are inserted
CREATE OR REPLACE FUNCTION update_user_xp_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user_xp record
    INSERT INTO user_xp (
        user_id, 
        total_xp, 
        current_level,
        xp_to_next_level,
        created_at,
        updated_at
    )
    VALUES (
        NEW.user_id, 
        NEW.amount,
        1,  -- Start at level 1
        100, -- Initial XP to next level
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_xp.total_xp + NEW.amount,
        updated_at = NOW();
    
    -- Log the update
    RAISE NOTICE 'Updated user_xp for user % with % XP', NEW.user_id, NEW.amount;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_xp_trigger ON xp_transactions;

-- 3. Create trigger for xp_transactions inserts
CREATE TRIGGER update_user_xp_trigger
AFTER INSERT ON xp_transactions
FOR EACH ROW
EXECUTE FUNCTION update_user_xp_on_transaction();

-- 4. Create or replace function to handle xp_events (if using that table)
CREATE OR REPLACE FUNCTION update_user_xp_on_event()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user_xp record
    INSERT INTO user_xp (
        user_id, 
        total_xp, 
        current_level,
        xp_to_next_level,
        created_at,
        updated_at
    )
    VALUES (
        NEW.user_id, 
        NEW.xp_change,
        1,  -- Start at level 1
        100, -- Initial XP to next level
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = user_xp.total_xp + NEW.xp_change,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_xp_on_event_trigger ON xp_events;

-- 6. Create trigger for xp_events inserts (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_events') THEN
        CREATE TRIGGER update_user_xp_on_event_trigger
        AFTER INSERT ON xp_events
        FOR EACH ROW
        EXECUTE FUNCTION update_user_xp_on_event();
    END IF;
END $$;

-- 7. Fix any missing user_xp records by aggregating from xp_transactions
INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level, created_at, updated_at)
SELECT 
    user_id,
    SUM(amount) as total_xp,
    1 as current_level,
    100 as xp_to_next_level,
    MIN(created_at) as created_at,
    MAX(created_at) as updated_at
FROM xp_transactions
WHERE user_id NOT IN (SELECT user_id FROM user_xp)
GROUP BY user_id;

-- 8. Update existing user_xp records to ensure they're in sync
UPDATE user_xp
SET 
    total_xp = COALESCE((
        SELECT SUM(amount) 
        FROM xp_transactions 
        WHERE xp_transactions.user_id = user_xp.user_id
    ), 0),
    updated_at = NOW()
WHERE EXISTS (
    SELECT 1 FROM xp_transactions WHERE xp_transactions.user_id = user_xp.user_id
);

-- 9. Create a function to recalculate user XP (for manual fixes)
CREATE OR REPLACE FUNCTION recalculate_user_xp(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_total_xp INTEGER;
BEGIN
    -- Calculate total XP from transactions
    SELECT COALESCE(SUM(amount), 0) INTO v_total_xp
    FROM xp_transactions
    WHERE user_id = p_user_id;
    
    -- Update user_xp
    INSERT INTO user_xp (user_id, total_xp, current_level, xp_to_next_level, created_at, updated_at)
    VALUES (p_user_id, v_total_xp, 1, 100, NOW(), NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = v_total_xp,
        updated_at = NOW();
    
    RETURN v_total_xp;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION recalculate_user_xp(UUID) TO authenticated;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if triggers are created
SELECT 
    trigger_name, 
    event_manipulation, 
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name LIKE '%user_xp%';

-- Check current XP totals
SELECT 
    u.user_id,
    u.total_xp as user_xp_total,
    COALESCE(t.transaction_total, 0) as transaction_total,
    u.total_xp - COALESCE(t.transaction_total, 0) as difference
FROM user_xp u
LEFT JOIN (
    SELECT user_id, SUM(amount) as transaction_total
    FROM xp_transactions
    GROUP BY user_id
) t ON u.user_id = t.user_id
WHERE u.total_xp != COALESCE(t.transaction_total, 0)
ORDER BY difference DESC;

-- Test the trigger with a sample insert (DO NOT RUN IN PRODUCTION)
-- INSERT INTO xp_transactions (user_id, amount, type, description)
-- VALUES ('YOUR_USER_ID_HERE', 10, 'test', 'Testing trigger')
-- RETURNING *;