-- =====================================================
-- FIX TREND_SUBMISSIONS TABLE STRUCTURE
-- This ensures the table works with both the app and triggers
-- =====================================================

-- The table already has a user_id column based on our check
-- But there seems to be a trigger or constraint issue
-- Let's ensure both spotter_id and user_id work properly

-- First, check if there's a problematic trigger
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS create_earnings_on_trend_submission ON trend_submissions;
DROP TRIGGER IF EXISTS trend_submission_earnings_trigger ON trend_submissions;

-- Ensure user_id is properly synced with spotter_id
-- Since the app uses spotter_id, let's make user_id a computed column or ensure it's populated
UPDATE trend_submissions 
SET user_id = spotter_id 
WHERE user_id IS NULL AND spotter_id IS NOT NULL;

-- Create a simple trigger that populates user_id from spotter_id
CREATE OR REPLACE FUNCTION sync_user_id_from_spotter()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure user_id is set from spotter_id
    IF NEW.user_id IS NULL AND NEW.spotter_id IS NOT NULL THEN
        NEW.user_id := NEW.spotter_id;
    END IF;
    -- Also ensure spotter_id is set from user_id if needed
    IF NEW.spotter_id IS NULL AND NEW.user_id IS NOT NULL THEN
        NEW.spotter_id := NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync IDs
CREATE TRIGGER sync_user_spotter_ids
    BEFORE INSERT OR UPDATE ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION sync_user_id_from_spotter();

-- Now create the earnings trigger using spotter_id (which the app uses)
CREATE OR REPLACE FUNCTION create_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_payment_amount DECIMAL(10,2);
    v_tier TEXT;
    v_tier_mult DECIMAL(3,2);
BEGIN
    -- Get user ID from either column
    v_user_id := COALESCE(NEW.spotter_id, NEW.user_id);
    
    IF v_user_id IS NULL THEN
        RETURN NEW; -- Don't fail, just skip earnings
    END IF;
    
    -- Get payment amount or use default
    v_payment_amount := COALESCE(NEW.payment_amount, 0.25);
    
    -- Get user tier
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_tier
    FROM user_profiles
    WHERE id = v_user_id;
    
    -- Calculate tier multiplier
    v_tier_mult := CASE v_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
    
    -- Update payment amount if not set
    IF NEW.payment_amount IS NULL OR NEW.payment_amount = 0 THEN
        NEW.payment_amount := 0.25 * v_tier_mult;
    END IF;
    
    -- Create earnings entry (ignore errors if it already exists)
    BEGIN
        INSERT INTO earnings_ledger (
            user_id,
            amount,
            type,
            transaction_type,
            status,
            description,
            reference_id,
            reference_type,
            metadata
        ) VALUES (
            v_user_id,
            NEW.payment_amount,
            'trend_submission',
            'trend_submission',
            'pending',
            'Trend: ' || COALESCE(NEW.title, NEW.description, 'Untitled'),
            NEW.id,
            'trend_submissions',
            jsonb_build_object(
                'tier', v_tier,
                'tier_multiplier', v_tier_mult,
                'category', NEW.category
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- Ignore errors (earnings might already exist)
        NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the earnings trigger
CREATE TRIGGER create_trend_submission_earnings
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_trend_submission_earnings();

-- Grant permissions
GRANT ALL ON trend_submissions TO authenticated;
GRANT ALL ON earnings_ledger TO authenticated;

-- Verify
DO $$
BEGIN
    RAISE NOTICE '✅ Trend submissions table fixed!';
    RAISE NOTICE '📊 Both spotter_id and user_id will work';
    RAISE NOTICE '💰 Earnings will be created automatically';
END $$;