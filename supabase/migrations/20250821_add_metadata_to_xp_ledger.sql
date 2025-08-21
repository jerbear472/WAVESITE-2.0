-- Add missing metadata column to xp_ledger table
-- This resolves the error: column "metadata" of relation "xp_ledger" does not exist

BEGIN;

-- Add metadata column to xp_ledger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'xp_ledger' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE xp_ledger ADD COLUMN metadata JSONB DEFAULT '{}';
        RAISE NOTICE 'Added metadata column to xp_ledger table';
    ELSE
        RAISE NOTICE 'metadata column already exists in xp_ledger table';
    END IF;
END $$;

-- Update the award_xp function to include metadata parameter
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT);

CREATE OR REPLACE FUNCTION award_xp(
  p_user_id UUID,
  p_amount INTEGER,
  p_reason TEXT,
  p_status TEXT DEFAULT 'approved',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_xp_id UUID;
BEGIN
  INSERT INTO xp_ledger (user_id, amount, xp_amount, reason, status, metadata, created_at)
  VALUES (p_user_id, p_amount, p_amount, p_reason, p_status, p_metadata, NOW())
  RETURNING id INTO v_xp_id;
  
  RETURN v_xp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the updated function
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, TEXT, JSONB) TO authenticated;

-- Update any existing records that might have NULL metadata
UPDATE xp_ledger SET metadata = '{}' WHERE metadata IS NULL;

COMMIT;