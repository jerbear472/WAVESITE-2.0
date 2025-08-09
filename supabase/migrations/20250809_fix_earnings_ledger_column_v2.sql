-- Fix earnings_ledger column issue - v2
-- The table has both 'earning_type' and 'type' columns, causing confusion

-- First, let's check what columns exist
DO $$
DECLARE
    has_earning_type BOOLEAN;
    has_type BOOLEAN;
BEGIN
    -- Check if 'earning_type' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'earning_type'
    ) INTO has_earning_type;
    
    -- Check if 'type' column exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'type'
    ) INTO has_type;
    
    RAISE NOTICE 'Column status - earning_type: %, type: %', has_earning_type, has_type;
    
    -- If both columns exist, we need to migrate data and drop earning_type
    IF has_earning_type AND has_type THEN
        -- Copy any data from earning_type to type if type is null
        UPDATE public.earnings_ledger 
        SET type = earning_type 
        WHERE type IS NULL AND earning_type IS NOT NULL;
        
        -- Drop the earning_type column as we're using 'type'
        ALTER TABLE public.earnings_ledger DROP COLUMN IF EXISTS earning_type;
        
        RAISE NOTICE 'Migrated data from earning_type to type and dropped earning_type column';
        
    ELSIF has_earning_type AND NOT has_type THEN
        -- Only earning_type exists, rename it to type
        ALTER TABLE public.earnings_ledger 
        RENAME COLUMN earning_type TO type;
        
        RAISE NOTICE 'Renamed earning_type to type';
        
    ELSIF NOT has_type THEN
        -- Neither column exists, create type
        ALTER TABLE public.earnings_ledger 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'trend_submission' 
        CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));
        
        RAISE NOTICE 'Added type column';
    END IF;
    
    -- Ensure the type column has proper constraints
    -- First drop any existing constraint
    ALTER TABLE public.earnings_ledger 
    DROP CONSTRAINT IF EXISTS earnings_ledger_type_check;
    
    -- Add the correct constraint
    ALTER TABLE public.earnings_ledger 
    ADD CONSTRAINT earnings_ledger_type_check 
    CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));
    
END $$;

-- Now fix the trigger function to properly handle earnings
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
BEGIN
    -- Extract payment amount from evidence JSON or use default
    v_payment_amount := COALESCE(
        (NEW.evidence->>'payment_amount')::DECIMAL(10,2),
        NEW.bounty_amount,
        1.00  -- Default base payment
    );
    
    -- Get user's spotter tier for proper multiplier
    SELECT spotter_tier INTO v_user_tier
    FROM profiles
    WHERE id = NEW.spotter_id;
    
    -- Apply tier multiplier if not already applied
    IF v_user_tier IS NOT NULL THEN
        SELECT get_spotter_tier_multiplier(COALESCE(v_user_tier, 'learning')) 
        INTO v_tier_multiplier;
        
        -- Check if multiplier seems to be already applied (payment > 3 suggests multipliers applied)
        IF v_payment_amount <= 3.0 THEN 
            v_payment_amount := v_payment_amount * COALESCE(v_tier_multiplier, 0.7);
        END IF;
    END IF;
    
    -- Ensure payment amount is reasonable
    v_payment_amount := LEAST(v_payment_amount, 50.00); -- Cap at $50 per submission
    v_payment_amount := GREATEST(v_payment_amount, 0.10); -- Minimum 10 cents
    
    -- Insert earnings record with proper column name
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,  -- Using 'type' column
        description,
        reference_id,
        reference_table,
        status,
        created_at
    ) VALUES (
        NEW.spotter_id,
        v_payment_amount,
        'trend_submission',
        'Trend: ' || LEFT(COALESCE(NEW.description, 'Untitled'), 100),
        NEW.id,
        'trend_submissions',
        'pending',
        NOW()
    ) ON CONFLICT DO NOTHING; -- Prevent duplicate entries
    
    -- Update user's pending earnings
    UPDATE profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_payment_amount,
        updated_at = NOW()
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the trend submission
        RAISE WARNING 'Failed to create earnings record for trend %: %', NEW.id, SQLERRM;
        -- Still return NEW so the trend submission succeeds
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_trend_submission_create ON public.trend_submissions;
DROP TRIGGER IF EXISTS handle_trend_earnings ON public.trend_submissions;

CREATE TRIGGER on_trend_submission_create
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- Also create/update function for validation earnings
CREATE OR REPLACE FUNCTION handle_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
BEGIN
    -- Base validation payment
    v_payment_amount := COALESCE(NEW.reward_amount, 0.01);
    
    -- Get user's spotter tier
    SELECT spotter_tier INTO v_user_tier
    FROM profiles
    WHERE id = NEW.validator_id;
    
    -- Apply tier multiplier
    IF v_user_tier IS NOT NULL THEN
        SELECT get_spotter_tier_multiplier(COALESCE(v_user_tier, 'learning')) 
        INTO v_tier_multiplier;
        v_payment_amount := v_payment_amount * COALESCE(v_tier_multiplier, 0.7);
    END IF;
    
    -- Insert earnings record
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,  -- Using 'type' column
        description,
        reference_id,
        reference_table,
        status,
        created_at
    ) VALUES (
        NEW.validator_id,
        v_payment_amount,
        'trend_validation',
        'Validation for trend',
        NEW.id,
        'trend_validations',
        'confirmed',
        NOW()
    ) ON CONFLICT DO NOTHING;
    
    -- Update user's earnings
    UPDATE profiles
    SET 
        total_earnings = COALESCE(total_earnings, 0) + v_payment_amount,
        updated_at = NOW()
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Failed to create validation earnings: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validations if it doesn't exist
DROP TRIGGER IF EXISTS on_validation_create ON public.trend_validations;
CREATE TRIGGER on_validation_create
    AFTER INSERT ON public.trend_validations
    FOR EACH ROW 
    EXECUTE FUNCTION handle_validation_earnings();

-- Add helpful comments
COMMENT ON COLUMN public.earnings_ledger.type IS 'Type of earning: trend_submission, trend_validation, challenge_completion, bonus, referral';
COMMENT ON FUNCTION handle_trend_submission_earnings() IS 'Automatically creates earnings record when trend is submitted, applying spotter tier multipliers';
COMMENT ON FUNCTION handle_validation_earnings() IS 'Automatically creates earnings record when validation is made, applying spotter tier multipliers';