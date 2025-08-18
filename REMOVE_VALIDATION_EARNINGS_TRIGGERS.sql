-- =====================================================
-- REMOVE ALL VALIDATION EARNINGS TRIGGERS
-- This ensures only the frontend creates validation earnings
-- =====================================================

-- Drop all potential validation earnings triggers
DROP TRIGGER IF EXISTS calculate_validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS handle_validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS add_validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS create_validation_earnings_trigger ON trend_validations CASCADE;
DROP TRIGGER IF EXISTS insert_validation_earnings_trigger ON trend_validations CASCADE;

-- Drop all potential validation earnings functions
DROP FUNCTION IF EXISTS calculate_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS handle_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS add_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS create_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS insert_validation_earnings() CASCADE;
DROP FUNCTION IF EXISTS process_validation_earnings() CASCADE;

-- Check for any remaining triggers on trend_validations
DO $$
DECLARE
    trigger_record RECORD;
    trigger_count INTEGER := 0;
BEGIN
    -- List all triggers on trend_validations table
    FOR trigger_record IN
        SELECT trigger_name, event_manipulation, action_statement
        FROM information_schema.triggers
        WHERE event_object_table = 'trend_validations'
    LOOP
        trigger_count := trigger_count + 1;
        RAISE NOTICE 'Found trigger: % (%) - %', 
            trigger_record.trigger_name, 
            trigger_record.event_manipulation, 
            trigger_record.action_statement;
    END LOOP;
    
    IF trigger_count = 0 THEN
        RAISE NOTICE '✅ No triggers found on trend_validations table';
    ELSE
        RAISE NOTICE '⚠️  Found % trigger(s) on trend_validations table', trigger_count;
    END IF;
END $$;

-- Check for any functions that might create earnings
DO $$
DECLARE
    func_record RECORD;
    func_count INTEGER := 0;
BEGIN
    FOR func_record IN
        SELECT proname, prosrc
        FROM pg_proc
        WHERE prosrc LIKE '%earnings_ledger%'
        AND prosrc LIKE '%validation%'
    LOOP
        func_count := func_count + 1;
        RAISE NOTICE 'Found function with earnings_ledger + validation: %', func_record.proname;
    END LOOP;
    
    IF func_count = 0 THEN
        RAISE NOTICE '✅ No functions found that create validation earnings';
    ELSE
        RAISE NOTICE '⚠️  Found % function(s) that might create validation earnings', func_count;
    END IF;
END $$;

RAISE NOTICE '';
RAISE NOTICE '🎯 VALIDATION EARNINGS CLEANUP COMPLETE';
RAISE NOTICE '💡 Only the frontend should now create validation earnings';
RAISE NOTICE '📝 Expected: $0.02 per validation, no database triggers';