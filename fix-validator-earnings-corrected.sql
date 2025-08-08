-- Fix validator earnings system - CORRECTED VALIDATION AMOUNT

-- 1. First, check if the trend_validations table has the right columns
-- Update the column name if needed (trend_id -> trend_submission_id for consistency)
DO $$ 
BEGIN
    -- Check if trend_id column exists and trend_submission_id doesn't
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trend_validations' 
               AND column_name = 'trend_id'
               AND table_schema = 'public') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'trend_validations' 
                    AND column_name = 'trend_submission_id'
                    AND table_schema = 'public') THEN
        
        -- Rename the column for consistency
        ALTER TABLE public.trend_validations 
        RENAME COLUMN trend_id TO trend_submission_id;
        
        RAISE NOTICE 'Renamed trend_id to trend_submission_id in trend_validations table';
    END IF;
END $$;

-- 2. Create function to add earnings for validators (CORRECTED AMOUNT)
CREATE OR REPLACE FUNCTION add_validator_earnings()
RETURNS TRIGGER AS $$
DECLARE
    earning_amount DECIMAL(10,2) := 0.02; -- CORRECTED: $0.02 per validation (matches EARNINGS_CONFIG)
BEGIN
    -- Add earnings for the validator
    INSERT INTO public.earnings_ledger (
        user_id,
        trend_submission_id,
        amount,
        status,
        earning_type,
        notes
    ) VALUES (
        NEW.validator_id,
        NEW.trend_submission_id,
        earning_amount,
        'approved', -- Validation earnings are immediately approved
        'validation',
        'Earnings for validating trend: ' || NEW.vote
    );
    
    -- Update the validator's approved earnings in their profile
    UPDATE public.profiles 
    SET earnings_approved = COALESCE(earnings_approved, 0) + earning_amount
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for validator earnings
DROP TRIGGER IF EXISTS add_validator_earnings_trigger ON trend_validations;
CREATE TRIGGER add_validator_earnings_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION add_validator_earnings();

-- 4. Create function to refresh user total earnings (for immediate updates)
CREATE OR REPLACE FUNCTION refresh_user_earnings(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        earnings_pending = COALESCE((
            SELECT SUM(amount) FROM public.earnings_ledger 
            WHERE user_id = p_user_id AND status = 'pending'
        ), 0),
        earnings_approved = COALESCE((
            SELECT SUM(amount) FROM public.earnings_ledger 
            WHERE user_id = p_user_id AND status = 'approved'
        ), 0),
        earnings_paid = COALESCE((
            SELECT SUM(amount) FROM public.earnings_ledger 
            WHERE user_id = p_user_id AND status = 'paid'
        ), 0)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION refresh_user_earnings(UUID) TO authenticated;
GRANT SELECT, INSERT ON public.earnings_ledger TO authenticated;
GRANT UPDATE ON public.profiles TO authenticated;

-- 6. Create an index for better performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_status 
ON public.earnings_ledger(user_id, status);

-- 7. UPDATE EXISTING VALIDATION EARNINGS FROM $0.01 TO $0.02
UPDATE public.earnings_ledger 
SET amount = 0.02
WHERE earning_type = 'validation' 
  AND amount = 0.01;

-- 8. Recalculate all user profile earnings after the correction
UPDATE public.profiles 
SET 
    earnings_approved = COALESCE((
        SELECT SUM(amount) FROM public.earnings_ledger 
        WHERE user_id = profiles.id AND status = 'approved'
    ), 0),
    earnings_pending = COALESCE((
        SELECT SUM(amount) FROM public.earnings_ledger 
        WHERE user_id = profiles.id AND status = 'pending'
    ), 0),
    earnings_paid = COALESCE((
        SELECT SUM(amount) FROM public.earnings_ledger 
        WHERE user_id = profiles.id AND status = 'paid'
    ), 0);

COMMENT ON FUNCTION add_validator_earnings() IS 'Automatically adds $0.02 earnings to validators profile when they verify a trend (CORRECTED AMOUNT)';
COMMENT ON FUNCTION refresh_user_earnings(UUID) IS 'Recalculates and updates user earnings from the earnings_ledger table';