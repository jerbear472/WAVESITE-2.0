-- Fix transaction_type null error in earnings trigger

-- 1. Check the current trigger function
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE p.proname = 'create_earnings_on_trend_submission';

-- 2. Fix the trigger function to include transaction_type
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
    
    -- Insert into earnings_ledger with ALL required fields
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        transaction_type,  -- IMPORTANT: Include this field
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.spotter_id,
        v_payment_amount,
        'trend_submission',
        'credit',  -- or 'trend_submission' depending on your enum values
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

-- 3. Check what values are allowed for transaction_type
SELECT 
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default,
    pg_get_constraintdef(con.oid) as constraint_def
FROM information_schema.columns c
LEFT JOIN pg_constraint con 
    ON con.conrelid = (SELECT oid FROM pg_class WHERE relname = 'earnings_ledger')
    AND con.conname LIKE '%transaction_type%'
WHERE c.table_name = 'earnings_ledger' 
    AND c.column_name = 'transaction_type';

-- 4. If transaction_type has an enum constraint, check valid values
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%transaction%'
ORDER BY e.enumsortorder;

-- 5. Alternative: Make transaction_type nullable temporarily
-- ALTER TABLE earnings_ledger ALTER COLUMN transaction_type DROP NOT NULL;

-- 6. Or set a default value
-- ALTER TABLE earnings_ledger ALTER COLUMN transaction_type SET DEFAULT 'credit';