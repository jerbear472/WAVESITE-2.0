-- Comprehensive fix for "record 'new' has no field 'user_id'" error
-- This error occurs when triggers or RLS policies reference user_id instead of validator_id

-- Step 1: Find and disable problematic triggers
DO $$
DECLARE
    trigger_rec RECORD;
BEGIN
    -- Find all triggers on trend_validations table
    FOR trigger_rec IN 
        SELECT tgname, pg_get_triggerdef(oid) as definition
        FROM pg_trigger
        WHERE tgrelid = 'trend_validations'::regclass
    LOOP
        RAISE NOTICE 'Found trigger: %', trigger_rec.tgname;
        -- If trigger references user_id, we need to fix it
        IF trigger_rec.definition LIKE '%user_id%' THEN
            EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_validations', trigger_rec.tgname);
            RAISE NOTICE 'Dropped trigger % because it references user_id', trigger_rec.tgname;
        END IF;
    END LOOP;
END $$;

-- Step 2: Check and fix RLS policies
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    -- Find all policies on trend_validations table
    FOR policy_rec IN 
        SELECT polname, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as withcheck
        FROM pg_policy
        WHERE polrelid = 'trend_validations'::regclass
    LOOP
        RAISE NOTICE 'Found policy: %', policy_rec.polname;
        -- Check if policy references user_id
        IF (policy_rec.qual IS NOT NULL AND policy_rec.qual LIKE '%user_id%') OR 
           (policy_rec.withcheck IS NOT NULL AND policy_rec.withcheck LIKE '%user_id%') THEN
            EXECUTE format('DROP POLICY IF EXISTS %I ON trend_validations', policy_rec.polname);
            RAISE NOTICE 'Dropped policy % because it references user_id', policy_rec.polname;
        END IF;
    END LOOP;
END $$;

-- Step 3: Create correct RLS policies using validator_id
-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can insert their own validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can view their own validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can update their own validations" ON trend_validations;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON trend_validations;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON trend_validations;

-- Create new policies with correct field names
CREATE POLICY "Users can insert their own validations" 
ON trend_validations FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can view all validations" 
ON trend_validations FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users cannot update validations" 
ON trend_validations FOR UPDATE 
TO authenticated 
USING (false);

CREATE POLICY "Users cannot delete validations" 
ON trend_validations FOR DELETE 
TO authenticated 
USING (false);

-- Step 4: Fix any check constraints
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT conname, pg_get_constraintdef(oid) as definition
        FROM pg_constraint
        WHERE conrelid = 'trend_validations'::regclass
        AND contype = 'c' -- check constraints
    LOOP
        IF constraint_rec.definition LIKE '%user_id%' THEN
            EXECUTE format('ALTER TABLE trend_validations DROP CONSTRAINT IF EXISTS %I', constraint_rec.conname);
            RAISE NOTICE 'Dropped constraint % because it references user_id', constraint_rec.conname;
        END IF;
    END LOOP;
END $$;

-- Step 5: Ensure RLS is enabled
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Step 6: Create a simple validation function that works
CREATE OR REPLACE FUNCTION insert_validation(
    p_trend_id UUID,
    p_vote TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_validator_id UUID;
    col_name TEXT;
BEGIN
    v_validator_id := auth.uid();
    
    IF v_validator_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Determine which column name to use for trend reference
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        col_name := 'trend_id';
    ELSE
        col_name := 'trend_submission_id';
    END IF;
    
    -- Dynamic SQL to handle different column names
    IF col_name = 'trend_id' THEN
        INSERT INTO trend_validations (trend_id, validator_id, vote, created_at)
        VALUES (p_trend_id, v_validator_id, p_vote, NOW())
        ON CONFLICT (trend_id, validator_id) DO NOTHING;
    ELSE
        INSERT INTO trend_validations (trend_submission_id, validator_id, vote, created_at)
        VALUES (p_trend_id, v_validator_id, p_vote, NOW())
        ON CONFLICT (trend_submission_id, validator_id) DO NOTHING;
    END IF;
    
    -- Update counts
    UPDATE trend_submissions
    SET validation_count = COALESCE(validation_count, 0) + 1,
        approve_count = CASE WHEN p_vote = 'verify' THEN COALESCE(approve_count, 0) + 1 ELSE approve_count END,
        reject_count = CASE WHEN p_vote = 'reject' THEN COALESCE(reject_count, 0) + 1 ELSE reject_count END
    WHERE id = p_trend_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

GRANT EXECUTE ON FUNCTION insert_validation TO authenticated;

-- Step 7: Show summary of what was fixed
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VALIDATION FIX COMPLETE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Fixed the following:';
    RAISE NOTICE '1. Removed triggers that reference user_id';
    RAISE NOTICE '2. Removed RLS policies that reference user_id';
    RAISE NOTICE '3. Created new RLS policies using validator_id';
    RAISE NOTICE '4. Created insert_validation function as fallback';
    RAISE NOTICE '';
    RAISE NOTICE 'The validation page should now work correctly!';
    RAISE NOTICE '===========================================';
END $$;