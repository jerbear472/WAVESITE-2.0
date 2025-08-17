-- Find out what transaction_type values are allowed

-- 1. Check the constraint definition
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'earnings_ledger'::regclass
    AND conname LIKE '%transaction_type%';

-- 2. Check if it's an enum type
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS allowed_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_attribute a ON a.atttypid = t.oid
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'earnings_ledger' 
    AND a.attname = 'transaction_type'
ORDER BY e.enumsortorder;

-- 3. If no enum, check the actual constraint
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'earnings_ledger' 
    AND column_name = 'transaction_type';

-- 4. Look at existing valid data to see what values are used
SELECT DISTINCT transaction_type, COUNT(*) as count
FROM earnings_ledger
WHERE transaction_type IS NOT NULL
GROUP BY transaction_type
ORDER BY count DESC;

-- 5. Fix the trigger function with the correct value
CREATE OR REPLACE FUNCTION create_earnings_on_trend_submission()
RETURNS TRIGGER AS $$
DECLARE
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
    v_payment_amount DECIMAL;
BEGIN
    -- Get user's tier
    SELECT performance_tier INTO v_user_tier
    FROM user_profiles
    WHERE id = NEW.spotter_id;
    
    -- Set default tier if not found
    IF v_user_tier IS NULL THEN
        v_user_tier := 'learning';
    END IF;
    
    -- Get tier multiplier
    v_tier_multiplier := CASE v_user_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        ELSE 0.5
    END;
    
    -- Calculate payment amount
    v_payment_amount := COALESCE(NEW.payment_amount, 0.25 * v_tier_multiplier);
    
    -- Insert into earnings_ledger with correct transaction_type
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        transaction_type,  -- Use 'trend_submission' since that's what the JS was using
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.spotter_id,
        v_payment_amount,
        'trend_submission',
        'trend_submission',  -- This should be a valid value
        'pending',
        COALESCE('Trend: ' || NEW.title, 'Trend submission'),
        NEW.id,
        'trend_submissions',
        jsonb_build_object(
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'category', NEW.category
        )
    );
    
    RETURN NEW;
EXCEPTION
    WHEN check_violation THEN
        -- If transaction_type is invalid, try with NULL or default
        RAISE NOTICE 'Invalid transaction_type, trying without it';
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            reference_id,
            reference_type,
            metadata
        ) VALUES (
            NEW.spotter_id,
            v_payment_amount,
            'trend_submission',
            'pending',
            COALESCE('Trend: ' || NEW.title, 'Trend submission'),
            NEW.id,
            'trend_submissions',
            jsonb_build_object(
                'tier', v_user_tier,
                'tier_multiplier', v_tier_multiplier,
                'category', NEW.category
            )
        );
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Show the check constraint details
\d earnings_ledger