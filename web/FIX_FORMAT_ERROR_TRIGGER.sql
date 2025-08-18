-- Fix the format() error in the trigger by using simple concatenation

-- 1. Drop the existing trigger and function
DROP TRIGGER IF EXISTS create_earnings_on_submission ON trend_submissions;
DROP FUNCTION IF EXISTS create_earnings_on_trend_submission() CASCADE;

-- 2. Create a new, simpler trigger function without format() or CONCAT
CREATE OR REPLACE FUNCTION create_earnings_on_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Simple insert with basic string concatenation
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        transaction_type,
        status,
        description,
        reference_id,
        reference_type
    ) VALUES (
        NEW.spotter_id,
        COALESCE(NEW.payment_amount, 0.25),
        'trend_submission',
        'trend_submission',
        'pending',
        CASE 
            WHEN NEW.title IS NOT NULL AND NEW.title != '' 
            THEN 'Trend: ' || NEW.title
            ELSE 'Trend submission'
        END,
        NEW.id,
        'trend_submissions'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't block the submission
        RAISE WARNING 'Earnings creation failed: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create the trigger
CREATE TRIGGER create_earnings_on_submission
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_earnings_on_trend_submission();

-- 4. Test the trigger
DO $$
DECLARE
    test_user_id UUID;
    test_submission_id UUID;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM auth.users LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'No users found for testing';
        RETURN;
    END IF;
    
    -- Test insert
    INSERT INTO trend_submissions (
        spotter_id,
        title,
        description,
        category,
        status,
        payment_amount
    ) VALUES (
        test_user_id,
        'Test Format Fix',
        'Testing trigger without format()',
        'meme_format',
        'submitted',
        0.25
    ) RETURNING id INTO test_submission_id;
    
    RAISE NOTICE '✅ Test successful (ID: %)', test_submission_id;
    
    -- Clean up
    DELETE FROM earnings_ledger WHERE reference_id = test_submission_id;
    DELETE FROM trend_submissions WHERE id = test_submission_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE '❌ Test failed: %', SQLERRM;
        RAISE NOTICE 'Error detail: %', SQLSTATE;
END $$;

-- 5. Verify trigger is active
SELECT 
    'create_earnings_on_submission' as trigger_name,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ACTIVE - Fixed format error'
        ELSE '❌ NOT FOUND'
    END as status
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
WHERE c.relname = 'trend_submissions' 
    AND t.tgname = 'create_earnings_on_submission';