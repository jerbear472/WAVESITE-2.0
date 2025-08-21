-- =============================================
-- FIX XP DISPLAY SYNCHRONIZATION
-- =============================================
-- This script ensures XP data is consistent across all tables/views
-- =============================================

-- 1. First, let's check if there's any data in user_xp table
SELECT 'Checking user_xp table...' as status;
SELECT user_id, total_xp, current_level 
FROM user_xp 
LIMIT 5;

-- 2. Check if there's data in xp_events
SELECT 'Checking xp_events table...' as status;
SELECT user_id, SUM(xp_change) as total_xp_from_events
FROM xp_events
GROUP BY user_id
LIMIT 5;

-- 3. Recalculate and update all users' XP from xp_events
SELECT 'Recalculating XP for all users...' as status;

-- First ensure all users have a row in user_xp
INSERT INTO user_xp (user_id, total_xp, current_level)
SELECT 
  u.id,
  0,
  1
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM user_xp ux WHERE ux.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Now update XP totals based on xp_events
UPDATE user_xp ux
SET 
  total_xp = COALESCE((
    SELECT SUM(xp_change)
    FROM xp_events xe
    WHERE xe.user_id = ux.user_id
  ), 0),
  last_xp_update = NOW();

-- 4. Update levels based on new XP totals
UPDATE user_xp
SET current_level = CASE
  WHEN total_xp >= 12500 THEN 15
  WHEN total_xp >= 10000 THEN 14
  WHEN total_xp >= 8000 THEN 13
  WHEN total_xp >= 6600 THEN 12
  WHEN total_xp >= 5500 THEN 11
  WHEN total_xp >= 4500 THEN 10
  WHEN total_xp >= 3600 THEN 9
  WHEN total_xp >= 2800 THEN 8
  WHEN total_xp >= 2100 THEN 7
  WHEN total_xp >= 1500 THEN 6
  WHEN total_xp >= 1000 THEN 5
  WHEN total_xp >= 600 THEN 4
  WHEN total_xp >= 300 THEN 3
  WHEN total_xp >= 100 THEN 2
  ELSE 1
END;

-- 5. If user has 730 XP but no events, create initial events to match
-- This handles legacy data where XP was set but events weren't created
DO $$
DECLARE
  v_user RECORD;
BEGIN
  FOR v_user IN 
    SELECT ux.user_id, ux.total_xp
    FROM user_xp ux
    WHERE ux.total_xp > 0
    AND NOT EXISTS (
      SELECT 1 FROM xp_events xe WHERE xe.user_id = ux.user_id
    )
  LOOP
    -- Create a single event to represent their current XP
    INSERT INTO xp_events (
      user_id,
      event_type,
      xp_change,
      description,
      created_at
    ) VALUES (
      v_user.user_id,
      'initial_xp',
      v_user.total_xp,
      'Initial XP balance',
      NOW()
    );
  END LOOP;
END $$;

-- 6. Verify the fix
SELECT 'Verification - user_xp_summary view:' as status;
SELECT 
  user_id,
  username,
  total_xp,
  level,
  level_title
FROM user_xp_summary
WHERE total_xp > 0
LIMIT 10;

-- 7. Create or replace function to ensure XP is always calculated correctly
CREATE OR REPLACE FUNCTION ensure_xp_consistency()
RETURNS TRIGGER AS $$
BEGIN
  -- Whenever xp_events changes, update user_xp
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE user_xp
    SET 
      total_xp = COALESCE((
        SELECT SUM(xp_change)
        FROM xp_events
        WHERE user_id = NEW.user_id
      ), 0),
      last_xp_update = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE user_xp
    SET 
      total_xp = COALESCE((
        SELECT SUM(xp_change)
        FROM xp_events
        WHERE user_id = OLD.user_id
      ), 0),
      last_xp_update = NOW()
    WHERE user_id = OLD.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger to maintain consistency
DROP TRIGGER IF EXISTS maintain_xp_consistency ON xp_events;
CREATE TRIGGER maintain_xp_consistency
AFTER INSERT OR UPDATE OR DELETE ON xp_events
FOR EACH ROW
EXECUTE FUNCTION ensure_xp_consistency();

SELECT 'XP synchronization fix complete!' as status;