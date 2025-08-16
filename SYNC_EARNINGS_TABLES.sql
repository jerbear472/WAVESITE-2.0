-- CRITICAL FIX: Sync earnings between profiles and user_profiles tables
-- The app reads from 'profiles' but updates 'user_profiles'!

-- 1. First, check what columns exist in profiles table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('pending_earnings', 'total_earnings', 'approved_earnings');

-- 2. Add earnings columns to profiles table if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS approved_earnings DECIMAL(10,2) DEFAULT 0.00;

-- 3. Sync current data from user_profiles to profiles
UPDATE profiles p
SET 
    pending_earnings = COALESCE(up.pending_earnings, 0),
    total_earnings = COALESCE(up.total_earned, 0),
    approved_earnings = COALESCE(up.approved_earnings, 0)
FROM user_profiles up
WHERE p.id = up.user_id;

-- 4. Create a trigger to keep them in sync
CREATE OR REPLACE FUNCTION sync_profiles_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update profiles table whenever user_profiles changes
    UPDATE profiles
    SET 
        pending_earnings = NEW.pending_earnings,
        total_earnings = NEW.total_earned,
        approved_earnings = NEW.approved_earnings
    WHERE id = NEW.user_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_earnings_to_profiles ON user_profiles;

-- Create the sync trigger
CREATE TRIGGER sync_earnings_to_profiles
AFTER INSERT OR UPDATE OF pending_earnings, total_earned, approved_earnings ON user_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profiles_earnings();

-- 5. Also create reverse sync (when profiles is updated, update user_profiles)
CREATE OR REPLACE FUNCTION sync_user_profiles_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert into user_profiles
    INSERT INTO user_profiles (
        user_id,
        pending_earnings,
        total_earned,
        approved_earnings,
        performance_tier
    ) VALUES (
        NEW.id,
        NEW.pending_earnings,
        NEW.total_earnings,
        NEW.approved_earnings,
        'learning'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        pending_earnings = NEW.pending_earnings,
        total_earned = NEW.total_earnings,
        approved_earnings = NEW.approved_earnings;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_earnings_from_profiles ON profiles;

-- Create the reverse sync trigger
CREATE TRIGGER sync_earnings_from_profiles
AFTER UPDATE OF pending_earnings, total_earnings, approved_earnings ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_user_profiles_earnings();

-- 6. Update the add_pending_earnings function to update BOTH tables
CREATE OR REPLACE FUNCTION add_pending_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Trend submission'
) RETURNS BOOLEAN AS $$
BEGIN
    -- Update user_profiles
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        total_earned = COALESCE(total_earned, 0) + p_amount,
        last_active = NOW()
    WHERE user_id = p_user_id;
    
    -- If no row was updated, create one
    IF NOT FOUND THEN
        INSERT INTO user_profiles (
            user_id, 
            pending_earnings,
            total_earned,
            performance_tier
        ) VALUES (
            p_user_id,
            p_amount,
            p_amount,
            'learning'
        );
    END IF;
    
    -- ALSO update profiles table directly (belt and suspenders)
    UPDATE profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + p_amount,
        total_earnings = COALESCE(total_earnings, 0) + p_amount
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION add_pending_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION sync_profiles_earnings TO authenticated;
GRANT EXECUTE ON FUNCTION sync_user_profiles_earnings TO authenticated;

-- 7. Recalculate all pending earnings from earnings_ledger for accuracy
UPDATE profiles p
SET pending_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM earnings_ledger
    WHERE user_id = p.id
    AND status IN ('pending', 'awaiting_validation')
);

UPDATE user_profiles up
SET pending_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM earnings_ledger
    WHERE user_id = up.user_id
    AND status IN ('pending', 'awaiting_validation')
);

-- Test output
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM profiles WHERE pending_earnings > 0;
    RAISE NOTICE '✅ EARNINGS TABLES SYNCED';
    RAISE NOTICE '   - profiles table has earnings columns';
    RAISE NOTICE '   - Triggers created to keep tables in sync';
    RAISE NOTICE '   - add_pending_earnings updates BOTH tables';
    RAISE NOTICE '   - % users have pending earnings', v_count;
    RAISE NOTICE '';
    RAISE NOTICE '🎯 The system now:';
    RAISE NOTICE '   1. Updates BOTH profiles and user_profiles tables';
    RAISE NOTICE '   2. Keeps them automatically in sync with triggers';
    RAISE NOTICE '   3. Auth context will now see the earnings!';
END $$;