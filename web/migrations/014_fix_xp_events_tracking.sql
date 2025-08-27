-- Fix XP Events Tracking for Trend Submissions
-- This ensures XP events are properly created with trend references

-- First, ensure xp_events table has all necessary columns
ALTER TABLE xp_events 
ADD COLUMN IF NOT EXISTS reference_id UUID,
ADD COLUMN IF NOT EXISTS reference_type TEXT;

-- Drop and recreate the award_xp function with correct parameters
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);

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

    -- Create XP event record with trend reference
    INSERT INTO xp_events (
        user_id,
        event_type,
        xp_change,
        description,
        reference_id,
        reference_type,
        created_at
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        COALESCE(p_description, p_type || ' +' || p_amount || ' XP'),
        p_reference_id,
        p_reference_type,
        NOW()
    );

    RETURN v_new_total;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION award_xp TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp TO service_role;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_xp_events_reference ON xp_events(reference_id, reference_type);
CREATE INDEX IF NOT EXISTS idx_xp_events_user_created ON xp_events(user_id, created_at DESC);

-- Verify the function exists
SELECT proname, pronargs, proargtypes::regtype[] 
FROM pg_proc 
WHERE proname = 'award_xp';