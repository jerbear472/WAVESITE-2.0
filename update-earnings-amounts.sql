-- Update earnings amounts to new higher rates for better participation

-- 1. Update the validator earnings trigger function to match new validation rewards
CREATE OR REPLACE FUNCTION add_validator_earnings()
RETURNS TRIGGER AS $$
DECLARE
    earning_amount DECIMAL(10,2) := 0.10; -- UPDATED: $0.10 per validation (matches new EARNINGS_CONFIG.VALIDATION_REWARDS.CORRECT_VALIDATION)
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

-- 2. Update existing validation earnings from old amounts to new amount
UPDATE public.earnings_ledger 
SET amount = 0.10
WHERE earning_type = 'validation' 
  AND amount IN (0.01, 0.02); -- Update from previous amounts

-- 3. Recalculate all user profile earnings after the update
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

-- 4. Add a comment explaining the update
COMMENT ON FUNCTION add_validator_earnings() IS 'Automatically adds $0.10 earnings to validators profile when they verify a trend (UPDATED AMOUNT for better participation)';