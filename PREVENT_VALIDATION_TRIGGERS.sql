-- PREVENT ANY VALIDATION TRIGGERS FROM CREATING EARNINGS
-- This script creates a blocking function that prevents automatic earnings

BEGIN;

-- ============================================
-- NUCLEAR OPTION: Create a blocking function
-- ============================================

-- Create a function that does nothing (returns NULL)
CREATE OR REPLACE FUNCTION block_validation_earnings() 
RETURNS TRIGGER AS $$
BEGIN
    -- Do nothing - just return NEW without creating any earnings
    -- This function acts as a shield against any automatic earnings creation
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- If any of these trigger names exist, replace them with our blocking function
DO $$
DECLARE
    trigger_names TEXT[] := ARRAY[
        'create_validation_earnings_trigger',
        'validation_earnings_trigger',
        'auto_validation_earnings',
        'validation_reward_trigger',
        'handle_new_validation',
        'process_validation_earnings',
        'auto_validation_reward',
        'validation_earnings_auto',
        'after_validation_insert',
        'before_validation_insert'
    ];
    trigger_name TEXT;
BEGIN
    FOREACH trigger_name IN ARRAY trigger_names
    LOOP
        -- Drop the trigger if it exists
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON trend_validations CASCADE', trigger_name);
        
        -- Create a blocking trigger with the same name
        -- This prevents any deployment script from recreating the harmful trigger
        EXECUTE format('
            CREATE TRIGGER %I
            AFTER INSERT ON trend_validations
            FOR EACH ROW
            EXECUTE FUNCTION block_validation_earnings()',
            trigger_name
        );
        
        RAISE NOTICE 'Created blocking trigger: %', trigger_name;
    END LOOP;
END $$;

-- ============================================
-- Create a monitoring function
-- ============================================

CREATE OR REPLACE FUNCTION check_validation_earnings()
RETURNS TABLE (
    check_type TEXT,
    result TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check for duplicate validation earnings
    RETURN QUERY
    SELECT 
        'Duplicate Entries'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Found ' || COUNT(*) || ' users with duplicate validation earnings'::TEXT
    FROM (
        SELECT user_id, trend_id
        FROM earnings_ledger
        WHERE type = 'validation'
        AND trend_id IS NOT NULL
        GROUP BY user_id, trend_id
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- Check for $0.10 validation earnings
    RETURN QUERY
    SELECT 
        'Incorrect Amounts'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Found ' || COUNT(*) || ' validation earnings not equal to $0.02'::TEXT
    FROM earnings_ledger
    WHERE type = 'validation'
    AND amount != 0.02;
    
    -- Check for active harmful triggers
    RETURN QUERY
    SELECT 
        'Harmful Triggers'::TEXT,
        CASE 
            WHEN COUNT(*) = 0 THEN 'PASS'::TEXT
            WHEN bool_and(action_statement LIKE '%block_validation_earnings%') THEN 'PASS (blocked)'::TEXT
            ELSE 'FAIL'::TEXT
        END,
        'Found ' || COUNT(*) || ' triggers on trend_validations table'::TEXT
    FROM information_schema.triggers
    WHERE event_object_table = 'trend_validations';
    
END;
$$ LANGUAGE plpgsql;

-- Run the check
SELECT * FROM check_validation_earnings();

COMMIT;

-- ============================================
-- INSTRUCTIONS FOR USE
-- ============================================
-- Run this query periodically to check for issues:
-- SELECT * FROM check_validation_earnings();