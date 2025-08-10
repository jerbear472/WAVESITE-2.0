-- ============================================================
-- FIX EARNINGS CONSISTENCY
-- Aligns database with the intended earnings structure:
-- BASE: $1.00 per trend submission + bonuses
-- VALIDATION: $0.01 per validation
-- ============================================================

-- STEP 1: Drop conflicting triggers
DROP TRIGGER IF EXISTS update_submission_earnings_trigger ON public.trend_submissions;
DROP FUNCTION IF EXISTS update_submission_earnings() CASCADE;

-- STEP 2: Create proper earnings trigger that matches earningsConfig.ts
CREATE OR REPLACE FUNCTION update_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_payment DECIMAL(10,2) := 1.00;  -- $1.00 base payment
    v_total_payment DECIMAL(10,2);
    v_bonus_amount DECIMAL(10,2) := 0.00;
BEGIN
    -- Only process on INSERT (new submissions)
    IF TG_OP = 'INSERT' THEN
        -- Calculate bonuses based on what's provided
        -- These match the bonus structure in earningsConfig.ts
        
        -- Screenshot bonus ($0.15)
        IF NEW.screenshot_url IS NOT NULL AND NEW.screenshot_url != '' THEN
            v_bonus_amount := v_bonus_amount + 0.15;
        END IF;
        
        -- High wave score bonus ($0.20 for score > 70)
        IF NEW.wave_score IS NOT NULL AND NEW.wave_score > 70 THEN
            v_bonus_amount := v_bonus_amount + 0.20;
        END IF;
        
        -- Creator info bonus ($0.05)
        IF NEW.creator_handle IS NOT NULL AND NEW.creator_handle != '' THEN
            v_bonus_amount := v_bonus_amount + 0.05;
        END IF;
        
        -- Rich hashtags bonus ($0.05 for 3+ hashtags)
        IF NEW.hashtags IS NOT NULL AND array_length(NEW.hashtags, 1) >= 3 THEN
            v_bonus_amount := v_bonus_amount + 0.05;
        END IF;
        
        -- Caption provided bonus ($0.05)
        IF NEW.post_caption IS NOT NULL AND NEW.post_caption != '' THEN
            v_bonus_amount := v_bonus_amount + 0.05;
        END IF;
        
        -- High engagement bonus ($0.20 for high likes/views ratio)
        IF NEW.views_count > 0 AND NEW.likes_count > 0 THEN
            IF (NEW.likes_count::DECIMAL / NEW.views_count) > 0.1 THEN
                v_bonus_amount := v_bonus_amount + 0.20;
            END IF;
        END IF;
        
        -- Viral content bonus ($0.50 for 1M+ views, $0.25 for 100k+ views)
        IF NEW.views_count IS NOT NULL THEN
            IF NEW.views_count > 1000000 THEN
                v_bonus_amount := v_bonus_amount + 0.50;
            ELSIF NEW.views_count > 100000 THEN
                v_bonus_amount := v_bonus_amount + 0.25;
            END IF;
        END IF;
        
        -- Calculate total payment (capped at $3.00 per submission)
        v_total_payment := LEAST(v_base_payment + v_bonus_amount, 3.00);
        
        -- Update user's earnings
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
            UPDATE public.profiles
            SET 
                earnings_pending = COALESCE(earnings_pending, 0) + v_total_payment,
                total_earnings = COALESCE(total_earnings, 0) + v_total_payment,
                total_submissions = COALESCE(total_submissions, 0) + 1
            WHERE id = NEW.spotter_id;
            
            RAISE NOTICE 'User % earned $% for submission (base: $%, bonuses: $%)', 
                NEW.spotter_id, v_total_payment, v_base_payment, v_bonus_amount;
        END IF;
        
        -- Store the calculated payment in the trend_submissions record
        -- (Add payment_amount column if it doesn't exist)
        NEW.quality_score := LEAST(v_total_payment / 3.00, 1.00); -- Use quality_score to track payment ratio
    END IF;
    
    -- Handle status changes (approved/rejected)
    IF TG_OP = 'UPDATE' THEN
        -- When a trend is approved, move earnings from pending to approved
        IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
            -- Get the original payment amount (stored in quality_score * 3)
            v_total_payment := OLD.quality_score * 3.00;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
                UPDATE public.profiles
                SET 
                    earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - v_total_payment),
                    earnings_approved = COALESCE(earnings_approved, 0) + v_total_payment
                WHERE id = NEW.spotter_id;
                
                RAISE NOTICE 'Moved $% from pending to approved for user %', v_total_payment, NEW.spotter_id;
            END IF;
        END IF;
        
        -- When a trend is rejected, remove from pending earnings
        IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
            v_total_payment := OLD.quality_score * 3.00;
            
            IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
                UPDATE public.profiles
                SET 
                    earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - v_total_payment)
                WHERE id = NEW.spotter_id;
                
                RAISE NOTICE 'Removed $% from pending earnings for user %', v_total_payment, NEW.spotter_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER update_submission_earnings_trigger
    BEFORE INSERT OR UPDATE ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_submission_earnings();

-- STEP 3: Add a payment_amount column to track actual payment
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2) DEFAULT 1.00;

-- STEP 4: Create a function to get user's earnings breakdown
CREATE OR REPLACE FUNCTION get_user_earnings(p_user_id UUID)
RETURNS TABLE (
    pending_earnings DECIMAL(10,2),
    approved_earnings DECIMAL(10,2),
    total_earnings DECIMAL(10,2),
    total_submissions INTEGER,
    total_validations INTEGER,
    average_payment DECIMAL(10,2),
    best_payment DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(p.earnings_pending, 0.00),
        COALESCE(p.earnings_approved, 0.00),
        COALESCE(p.total_earnings, 0.00),
        COALESCE(p.total_submissions, 0),
        COALESCE(p.total_validations, 0),
        CASE 
            WHEN p.total_submissions > 0 
            THEN ROUND(p.total_earnings / p.total_submissions, 2)
            ELSE 0.00
        END as average_payment,
        COALESCE((
            SELECT MAX(payment_amount) 
            FROM trend_submissions 
            WHERE spotter_id = p_user_id
        ), 0.00) as best_payment
    FROM profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- STEP 5: Update existing records to have proper payment amounts
UPDATE public.trend_submissions
SET payment_amount = CASE
    -- If they have high engagement metrics, give them bonus
    WHEN views_count > 1000000 THEN 2.50
    WHEN views_count > 100000 THEN 1.75
    WHEN screenshot_url IS NOT NULL THEN 1.15
    ELSE 1.00
END
WHERE payment_amount IS NULL OR payment_amount = 0;

-- STEP 6: Create view for earnings leaderboard
CREATE OR REPLACE VIEW earnings_leaderboard AS
SELECT 
    p.id,
    p.email,
    p.username,
    p.total_earnings,
    p.total_submissions,
    p.total_validations,
    CASE 
        WHEN p.total_submissions > 0 
        THEN ROUND(p.total_earnings / p.total_submissions, 2)
        ELSE 0.00
    END as avg_per_submission,
    RANK() OVER (ORDER BY p.total_earnings DESC) as earnings_rank
FROM profiles p
WHERE p.total_earnings > 0
ORDER BY p.total_earnings DESC;

-- Grant permissions
GRANT SELECT ON earnings_leaderboard TO authenticated;

-- STEP 7: Show current status
DO $$
DECLARE
    v_avg_payment DECIMAL(10,2);
    v_total_paid DECIMAL(10,2);
    v_user_count INT;
BEGIN
    SELECT 
        AVG(payment_amount),
        SUM(payment_amount),
        COUNT(DISTINCT spotter_id)
    INTO 
        v_avg_payment,
        v_total_paid,
        v_user_count
    FROM trend_submissions
    WHERE payment_amount IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'EARNINGS SYSTEM STATUS:';
    RAISE NOTICE '=================================';
    RAISE NOTICE 'Base Payment: $1.00 per submission';
    RAISE NOTICE 'Maximum with bonuses: $3.00';
    RAISE NOTICE 'Validation Payment: $0.01';
    RAISE NOTICE '';
    RAISE NOTICE 'Current Statistics:';
    RAISE NOTICE '  Average payment: $%', COALESCE(v_avg_payment, 1.00);
    RAISE NOTICE '  Total paid out: $%', COALESCE(v_total_paid, 0.00);
    RAISE NOTICE '  Active users: %', COALESCE(v_user_count, 0);
    RAISE NOTICE '=================================';
END $$;

-- Final summary
SELECT 
    'EARNINGS SYSTEM FIXED' as status,
    '$1.00' as base_payment,
    '$3.00' as max_with_bonuses,
    '$0.01' as validation_payment,
    COUNT(*) as total_submissions,
    ROUND(AVG(payment_amount), 2) as avg_payment
FROM trend_submissions;