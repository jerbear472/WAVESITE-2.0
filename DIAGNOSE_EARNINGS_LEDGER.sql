-- Diagnose and fix the earnings_ledger issue

-- ============================================
-- 1. Check what columns earnings_ledger has
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'earnings_ledger'
ORDER BY ordinal_position;

-- ============================================
-- 2. Check ALL triggers on trend_submissions
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'trend_submissions'
AND event_object_schema = 'public';

-- ============================================
-- 3. Check if there's a trigger trying to insert into earnings_ledger
-- ============================================
SELECT 
    proname AS function_name,
    prosrc AS function_source
FROM pg_proc
WHERE prosrc LIKE '%earnings_ledger%'
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- 4. IMMEDIATE FIX: Make earning_type nullable OR add default
-- ============================================

-- Option A: Make it nullable (safest)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger'
        AND column_name = 'earning_type'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE public.earnings_ledger 
        ALTER COLUMN earning_type DROP NOT NULL;
        
        RAISE NOTICE '✅ Made earning_type nullable';
    END IF;
END $$;

-- Option B: Add a default value
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger'
        AND column_name = 'earning_type'
    ) THEN
        ALTER TABLE public.earnings_ledger 
        ALTER COLUMN earning_type SET DEFAULT 'trend_submission';
        
        RAISE NOTICE '✅ Added default value to earning_type';
    END IF;
END $$;

-- ============================================
-- 5. Find and disable any function that inserts into earnings_ledger
-- ============================================

-- Check what functions reference earnings_ledger
SELECT DISTINCT
    p.proname AS function_name,
    'DROP FUNCTION IF EXISTS public.' || p.proname || '() CASCADE;' AS drop_command
FROM pg_proc p
WHERE p.prosrc LIKE '%INSERT%earnings_ledger%'
AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- 6. Nuclear option: Rename earnings_ledger to disable it
-- ============================================

-- If nothing else works, rename the table to disable it completely
-- ALTER TABLE public.earnings_ledger RENAME TO earnings_ledger_disabled;

-- ============================================
-- 7. Verify our main earnings system
-- ============================================

-- Check our main triggers are present
SELECT 
    'calculate_submission_earnings_trigger' as expected_trigger,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'calculate_submission_earnings_trigger'
    ) as exists
UNION ALL
SELECT 
    'calculate_validation_earnings_trigger' as expected_trigger,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'calculate_validation_earnings_trigger'
    ) as exists
UNION ALL
SELECT 
    'handle_trend_status_change_trigger' as expected_trigger,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'handle_trend_status_change_trigger'
    ) as exists;

-- ============================================
-- 8. Test if submission works
-- ============================================

-- Try a test insert (will rollback)
DO $$
DECLARE
    v_test_user_id UUID;
    v_test_trend_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO v_test_user_id 
    FROM profiles 
    LIMIT 1;
    
    IF v_test_user_id IS NOT NULL THEN
        -- Try to insert a test trend
        INSERT INTO trend_submissions (
            spotter_id,
            category,
            description,
            status
        ) VALUES (
            v_test_user_id,
            'tech',
            'Test submission to check earnings_ledger',
            'submitted'
        ) RETURNING id INTO v_test_trend_id;
        
        -- If we got here, it worked!
        RAISE NOTICE '✅ Test submission successful! ID: %', v_test_trend_id;
        
        -- Clean up test data
        DELETE FROM trend_submissions WHERE id = v_test_trend_id;
        
    ELSE
        RAISE NOTICE '⚠️ No test user found';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test submission failed: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- ============================================
-- Summary
-- ============================================
SELECT 
    '🔍 DIAGNOSIS COMPLETE' as status,
    'Check results above to see what is causing the issue' as message;