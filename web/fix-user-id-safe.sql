-- Safe version of the comprehensive fix that handles existing policies
-- This won't error if policies already exist

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

-- Step 2: Check and fix RLS policies (improved version)
DO $$
DECLARE
    policy_rec RECORD;
    has_user_id_reference BOOLEAN := false;
BEGIN
    -- First check if any policies reference user_id
    FOR policy_rec IN 
        SELECT polname, pg_get_expr(polqual, polrelid) as qual, pg_get_expr(polwithcheck, polrelid) as withcheck
        FROM pg_policy
        WHERE polrelid = 'trend_validations'::regclass
    LOOP
        IF (policy_rec.qual IS NOT NULL AND policy_rec.qual LIKE '%user_id%') OR 
           (policy_rec.withcheck IS NOT NULL AND policy_rec.withcheck LIKE '%user_id%') THEN
            has_user_id_reference := true;
            EXECUTE format('DROP POLICY IF EXISTS %I ON trend_validations', policy_rec.polname);
            RAISE NOTICE 'Dropped policy % because it references user_id', policy_rec.polname;
        END IF;
    END LOOP;
    
    -- Only recreate policies if we found and dropped some with user_id
    IF has_user_id_reference THEN
        RAISE NOTICE 'Recreating policies with correct field names...';
    END IF;
END $$;

-- Step 3: Ensure correct policies exist (without duplicates)
DO $$
BEGIN
    -- Check if policy exists before creating
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'trend_validations'::regclass 
        AND polname = 'Users can insert their own validations'
    ) THEN
        CREATE POLICY "Users can insert their own validations" 
        ON trend_validations FOR INSERT 
        TO authenticated 
        WITH CHECK (auth.uid() = validator_id);
        RAISE NOTICE 'Created policy: Users can insert their own validations';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can insert their own validations';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'trend_validations'::regclass 
        AND polname = 'Users can view all validations'
    ) THEN
        CREATE POLICY "Users can view all validations" 
        ON trend_validations FOR SELECT 
        TO authenticated 
        USING (true);
        RAISE NOTICE 'Created policy: Users can view all validations';
    ELSE
        RAISE NOTICE 'Policy already exists: Users can view all validations';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'trend_validations'::regclass 
        AND polname = 'Users cannot update validations'
    ) THEN
        CREATE POLICY "Users cannot update validations" 
        ON trend_validations FOR UPDATE 
        TO authenticated 
        USING (false);
        RAISE NOTICE 'Created policy: Users cannot update validations';
    ELSE
        RAISE NOTICE 'Policy already exists: Users cannot update validations';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy 
        WHERE polrelid = 'trend_validations'::regclass 
        AND polname = 'Users cannot delete validations'
    ) THEN
        CREATE POLICY "Users cannot delete validations" 
        ON trend_validations FOR DELETE 
        TO authenticated 
        USING (false);
        RAISE NOTICE 'Created policy: Users cannot delete validations';
    ELSE
        RAISE NOTICE 'Policy already exists: Users cannot delete validations';
    END IF;
END $$;

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

-- Step 6: Create or replace the validation function
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
    BEGIN
        IF col_name = 'trend_id' THEN
            INSERT INTO trend_validations (trend_id, validator_id, vote, created_at)
            VALUES (p_trend_id, v_validator_id, p_vote, NOW());
        ELSE
            INSERT INTO trend_validations (trend_submission_id, validator_id, vote, created_at)
            VALUES (p_trend_id, v_validator_id, p_vote, NOW());
        END IF;
    EXCEPTION
        WHEN unique_violation THEN
            -- User already voted, just return success
            RETURN jsonb_build_object('success', true, 'already_voted', true);
    END;
    
    -- Update counts (only if insert succeeded)
    UPDATE trend_submissions
    SET validation_count = COALESCE(validation_count, 0) + 1,
        approve_count = CASE WHEN p_vote = 'verify' THEN COALESCE(approve_count, 0) + 1 ELSE approve_count END,
        reject_count = CASE WHEN p_vote = 'reject' THEN COALESCE(reject_count, 0) + 1 ELSE reject_count END,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION insert_validation TO authenticated;

-- Step 7: Display diagnostic information
DO $$
DECLARE
    policy_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policy 
    WHERE polrelid = 'trend_validations'::regclass;
    
    SELECT COUNT(*) INTO trigger_count 
    FROM pg_trigger 
    WHERE tgrelid = 'trend_validations'::regclass
    AND tgisinternal = false;
    
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'VALIDATION FIX COMPLETE';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Current state:';
    RAISE NOTICE '  - % RLS policies on trend_validations', policy_count;
    RAISE NOTICE '  - % triggers on trend_validations', trigger_count;
    RAISE NOTICE '  - insert_validation function created/updated';
    RAISE NOTICE '';
    RAISE NOTICE 'The validation page should now work correctly!';
    RAISE NOTICE 'If you still see user_id errors, they may be coming from';
    RAISE NOTICE 'the cast_trend_vote function which needs to be fixed separately.';
    RAISE NOTICE '===========================================';
END $$;