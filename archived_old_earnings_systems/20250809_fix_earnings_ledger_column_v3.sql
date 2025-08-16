-- Fix earnings_ledger column issue - v3
-- First clean up existing data, then fix the column structure

-- Step 1: Check and report what values currently exist in the type column
DO $$
DECLARE
    invalid_types TEXT;
BEGIN
    -- Get list of invalid type values
    SELECT string_agg(DISTINCT type, ', ')
    INTO invalid_types
    FROM public.earnings_ledger
    WHERE type NOT IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
    AND type IS NOT NULL;
    
    IF invalid_types IS NOT NULL THEN
        RAISE NOTICE 'Found invalid type values: %', invalid_types;
    END IF;
END $$;

-- Step 2: Fix invalid data in the type column
UPDATE public.earnings_ledger
SET type = CASE
    -- Map common variations to standard values
    WHEN type IN ('scroll_session', 'scroll', 'session') THEN 'bonus'
    WHEN type IN ('trend', 'submission', 'trend_submit') THEN 'trend_submission'
    WHEN type IN ('validation', 'verify', 'trend_verify') THEN 'trend_validation'
    WHEN type IN ('challenge', 'daily_challenge') THEN 'challenge_completion'
    WHEN type IS NULL OR type = '' THEN 'trend_submission'
    -- Keep valid values as is
    WHEN type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral') THEN type
    -- Default anything else to bonus
    ELSE 'bonus'
END
WHERE type IS NULL 
   OR type NOT IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral');

-- Step 3: Handle the earning_type column if it exists
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
    
    -- If both columns exist, migrate and drop earning_type
    IF has_earning_type AND has_type THEN
        -- Copy data from earning_type where type is null or invalid
        UPDATE public.earnings_ledger 
        SET type = CASE
            WHEN earning_type IN ('scroll_session', 'scroll', 'session') THEN 'bonus'
            WHEN earning_type IN ('trend', 'submission', 'trend_submit') THEN 'trend_submission'
            WHEN earning_type IN ('validation', 'verify', 'trend_verify') THEN 'trend_validation'
            WHEN earning_type IN ('challenge', 'daily_challenge') THEN 'challenge_completion'
            WHEN earning_type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral') THEN earning_type
            ELSE 'bonus'
        END
        WHERE (type IS NULL OR type = '') AND earning_type IS NOT NULL;
        
        -- Drop the earning_type column
        ALTER TABLE public.earnings_ledger DROP COLUMN IF EXISTS earning_type;
        
        RAISE NOTICE 'Migrated data from earning_type to type and dropped earning_type column';
        
    ELSIF has_earning_type AND NOT has_type THEN
        -- Only earning_type exists, rename it to type
        ALTER TABLE public.earnings_ledger 
        RENAME COLUMN earning_type TO type;
        
        -- Fix any invalid values
        UPDATE public.earnings_ledger
        SET type = CASE
            WHEN type IN ('scroll_session', 'scroll', 'session') THEN 'bonus'
            WHEN type IN ('trend', 'submission', 'trend_submit') THEN 'trend_submission'
            WHEN type IN ('validation', 'verify', 'trend_verify') THEN 'trend_validation'
            WHEN type IN ('challenge', 'daily_challenge') THEN 'challenge_completion'
            WHEN type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral') THEN type
            ELSE 'bonus'
        END;
        
        RAISE NOTICE 'Renamed earning_type to type and fixed invalid values';
        
    ELSIF NOT has_type THEN
        -- Neither column exists, create type
        ALTER TABLE public.earnings_ledger 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'trend_submission';
        
        RAISE NOTICE 'Added type column';
    END IF;
END $$;

-- Step 4: Now add the constraint (after data is cleaned)
DO $$
BEGIN
    -- Drop any existing constraint
    ALTER TABLE public.earnings_ledger 
    DROP CONSTRAINT IF EXISTS earnings_ledger_type_check;
    
    ALTER TABLE public.earnings_ledger 
    DROP CONSTRAINT IF EXISTS earnings_ledger_earning_type_check;
    
    -- Add the correct constraint
    ALTER TABLE public.earnings_ledger 
    ADD CONSTRAINT earnings_ledger_type_check 
    CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));
    
    RAISE NOTICE 'Added type constraint successfully';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Could not add constraint: %. Data may still have invalid values.', SQLERRM;
END $$;

-- Step 5: Update the trigger function to handle earnings properly
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
    v_quality_score DECIMAL;
BEGIN
    -- Extract payment amount from evidence JSON or calculate it
    v_payment_amount := COALESCE(
        (NEW.evidence->>'payment_amount')::DECIMAL(10,2),
        NEW.bounty_amount,
        1.00  -- Default base payment
    );
    
    -- Get quality score
    v_quality_score := COALESCE(NEW.quality_score, 7.0);
    
    -- Get user's spotter tier for proper multiplier
    SELECT spotter_tier INTO v_user_tier
    FROM profiles
    WHERE id = NEW.spotter_id;
    
    -- Apply tier multiplier
    v_tier_multiplier := CASE 
        WHEN v_user_tier = 'elite' THEN 1.5
        WHEN v_user_tier = 'verified' THEN 1.0
        WHEN v_user_tier = 'learning' THEN 0.7
        WHEN v_user_tier = 'restricted' THEN 0.3
        ELSE 0.7  -- Default to learning
    END;
    
    -- Apply tier multiplier only if not already applied
    IF v_payment_amount <= 3.0 THEN 
        v_payment_amount := v_payment_amount * v_tier_multiplier;
    END IF;
    
    -- Apply quality bonus if quality is high
    IF v_quality_score >= 8 THEN
        v_payment_amount := v_payment_amount * 1.1; -- 10% bonus for high quality
    END IF;
    
    -- Ensure payment amount is reasonable
    v_payment_amount := LEAST(v_payment_amount, 50.00); -- Cap at $50
    v_payment_amount := GREATEST(v_payment_amount, 0.10); -- Min 10 cents
    
    -- Insert earnings record
    BEGIN
        INSERT INTO public.earnings_ledger (
            user_id,
            amount,
            type,
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
        );
        
        -- Update user's pending earnings
        UPDATE profiles
        SET 
            pending_earnings = COALESCE(pending_earnings, 0) + v_payment_amount,
            updated_at = NOW()
        WHERE id = NEW.spotter_id;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- Earnings record already exists, skip
            RAISE NOTICE 'Earnings record already exists for trend %', NEW.id;
        WHEN OTHERS THEN
            -- Log error but don't fail
            RAISE WARNING 'Failed to create earnings for trend %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Recreate triggers
DROP TRIGGER IF EXISTS on_trend_submission_create ON public.trend_submissions;
DROP TRIGGER IF EXISTS handle_trend_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS trend_submission_earnings_trigger ON public.trend_submissions;

CREATE TRIGGER on_trend_submission_create
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- Step 7: Create validation earnings function if it doesn't exist
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
    v_tier_multiplier := CASE 
        WHEN v_user_tier = 'elite' THEN 1.5
        WHEN v_user_tier = 'verified' THEN 1.0
        WHEN v_user_tier = 'learning' THEN 0.7
        WHEN v_user_tier = 'restricted' THEN 0.3
        ELSE 0.7
    END;
    
    v_payment_amount := v_payment_amount * v_tier_multiplier;
    
    -- Insert earnings record
    BEGIN
        INSERT INTO public.earnings_ledger (
            user_id,
            amount,
            type,
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
        );
        
        -- Update user's total earnings
        UPDATE profiles
        SET 
            total_earnings = COALESCE(total_earnings, 0) + v_payment_amount,
            updated_at = NOW()
        WHERE id = NEW.validator_id;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'Validation earnings already exist';
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create validation earnings: %', SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create validation trigger if needed
DROP TRIGGER IF EXISTS on_validation_create ON public.trend_validations;
CREATE TRIGGER on_validation_create
    AFTER INSERT ON public.trend_validations
    FOR EACH ROW 
    EXECUTE FUNCTION handle_validation_earnings();

-- Final step: Report status
DO $$
DECLARE
    type_count INTEGER;
    distinct_types TEXT;
BEGIN
    SELECT COUNT(DISTINCT type), string_agg(DISTINCT type, ', ' ORDER BY type)
    INTO type_count, distinct_types
    FROM public.earnings_ledger;
    
    RAISE NOTICE 'Migration complete! Found % distinct type values: %', type_count, distinct_types;
    
    -- Show count by type
    FOR type_count IN 
        SELECT type, COUNT(*) as cnt 
        FROM public.earnings_ledger 
        GROUP BY type 
        ORDER BY cnt DESC
    LOOP
        RAISE NOTICE 'Type: %, Count: %', type_count.type, type_count.cnt;
    END LOOP;
END $$;

-- Add documentation
COMMENT ON COLUMN public.earnings_ledger.type IS 'Type of earning: trend_submission, trend_validation, challenge_completion, bonus, referral. Note: scroll_session earnings have been converted to bonus type.';
COMMENT ON FUNCTION handle_trend_submission_earnings() IS 'Creates earnings record when trend is submitted, applying spotter tier multipliers and quality bonuses';
COMMENT ON FUNCTION handle_validation_earnings() IS 'Creates earnings record when validation is made, applying spotter tier multipliers';