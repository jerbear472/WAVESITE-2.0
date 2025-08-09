-- Fix earnings_ledger column name mismatch
-- The table has 'earning_type' but triggers are using 'type'

-- First, check if the column 'earning_type' exists and rename it to 'type'
DO $$
BEGIN
    -- Check if 'earning_type' column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'earning_type'
    ) THEN
        -- Rename column from 'earning_type' to 'type'
        ALTER TABLE public.earnings_ledger 
        RENAME COLUMN earning_type TO type;
        
        RAISE NOTICE 'Renamed column earning_type to type';
    END IF;
    
    -- If 'type' column doesn't exist at all, add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'type'
    ) THEN
        -- Add the 'type' column
        ALTER TABLE public.earnings_ledger 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'trend_submission' 
        CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));
        
        RAISE NOTICE 'Added type column to earnings_ledger';
    END IF;
END $$;

-- Update the trigger function to handle trend submission earnings correctly
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_tier_multiplier DECIMAL;
BEGIN
    -- Extract payment amount from evidence JSON
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
        v_tier_multiplier := get_spotter_tier_multiplier(COALESCE(v_user_tier, 'learning'));
        -- Only apply if not already in the payment amount
        IF v_payment_amount < 2.0 THEN -- Base payment is usually 1.00, so if it's less than 2, multiplier might not be applied
            v_payment_amount := v_payment_amount * v_tier_multiplier;
        END IF;
    END IF;
    
    -- Insert earnings record
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        description,
        reference_id,
        reference_table,
        status
    ) VALUES (
        NEW.spotter_id,
        v_payment_amount,
        'trend_submission',
        'Payment for trend: ' || COALESCE(NEW.description, 'Untitled'),
        NEW.id,
        'trend_submissions',
        'pending'
    );
    
    -- Update user's pending earnings
    UPDATE profiles
    SET pending_earnings = COALESCE(pending_earnings, 0) + v_payment_amount
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the trend submission
        RAISE WARNING 'Failed to create earnings record: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger (drop first if exists)
DROP TRIGGER IF EXISTS on_trend_submission_create ON public.trend_submissions;
CREATE TRIGGER on_trend_submission_create
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW 
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- Add comment for documentation
COMMENT ON COLUMN public.earnings_ledger.type IS 'Type of earning: trend_submission, trend_validation, challenge_completion, bonus, referral';