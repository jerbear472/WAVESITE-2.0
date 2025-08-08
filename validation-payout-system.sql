-- Scalable validation-based payout system
-- Only pay out when trends reach validation threshold

-- 1. Create validation thresholds configuration table
CREATE TABLE IF NOT EXISTS public.validation_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    required_validations INTEGER NOT NULL DEFAULT 1, -- Minimum validations needed to approve
    rejection_threshold INTEGER NOT NULL DEFAULT 2,  -- Rejections needed to reject
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default configuration (1 approve, 2 reject)
INSERT INTO public.validation_config (required_validations, rejection_threshold) 
VALUES (1, 2) 
ON CONFLICT (id) DO NOTHING;

-- 2. Add validation tracking columns to trend_submissions if they don't exist
DO $$ 
BEGIN
    -- Add approve_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'approve_count'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN approve_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add reject_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'reject_count'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN reject_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add validation_status if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'validation_status'
                   AND table_schema = 'public') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected'));
    END IF;
END $$;

-- 3. Function to process validation and handle payouts
CREATE OR REPLACE FUNCTION process_trend_validation()
RETURNS TRIGGER AS $$
DECLARE
    config_record RECORD;
    trend_record RECORD;
    new_approve_count INTEGER;
    new_reject_count INTEGER;
    new_validation_status TEXT;
BEGIN
    -- Get current validation configuration
    SELECT * INTO config_record FROM public.validation_config WHERE id = 1;
    
    -- Get current trend submission data
    SELECT * INTO trend_record FROM public.trend_submissions WHERE id = NEW.trend_submission_id;
    
    -- Calculate new counts based on the vote
    IF NEW.vote = 'approve' OR NEW.vote = 'valid' OR NEW.vote = TRUE THEN
        new_approve_count := COALESCE(trend_record.approve_count, 0) + 1;
        new_reject_count := COALESCE(trend_record.reject_count, 0);
    ELSIF NEW.vote = 'reject' OR NEW.vote = 'invalid' OR NEW.vote = FALSE THEN
        new_approve_count := COALESCE(trend_record.approve_count, 0);
        new_reject_count := COALESCE(trend_record.reject_count, 0) + 1;
    ELSE
        -- Unknown vote type, don't change counts
        new_approve_count := COALESCE(trend_record.approve_count, 0);
        new_reject_count := COALESCE(trend_record.reject_count, 0);
    END IF;
    
    -- Determine new validation status
    new_validation_status := 'pending';
    
    IF new_approve_count >= config_record.required_validations THEN
        new_validation_status := 'approved';
    ELSIF new_reject_count >= config_record.rejection_threshold THEN
        new_validation_status := 'rejected';
    END IF;
    
    -- Update trend submission counts and status
    UPDATE public.trend_submissions 
    SET 
        approve_count = new_approve_count,
        reject_count = new_reject_count,
        validation_status = new_validation_status,
        updated_at = NOW()
    WHERE id = NEW.trend_submission_id;
    
    -- Handle payout logic based on status change
    IF new_validation_status = 'approved' AND trend_record.validation_status = 'pending' THEN
        -- Trend just got approved - move earnings from pending to approved
        UPDATE public.earnings_ledger 
        SET 
            status = 'approved',
            updated_at = NOW()
        WHERE trend_submission_id = NEW.trend_submission_id 
          AND status = 'pending'
          AND earning_type = 'trend_submission';
        
        -- Update submitter's profile earnings
        UPDATE public.profiles 
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - COALESCE((
                SELECT SUM(amount) FROM public.earnings_ledger 
                WHERE trend_submission_id = NEW.trend_submission_id 
                  AND earning_type = 'trend_submission'
            ), 0)),
            earnings_approved = COALESCE(earnings_approved, 0) + COALESCE((
                SELECT SUM(amount) FROM public.earnings_ledger 
                WHERE trend_submission_id = NEW.trend_submission_id 
                  AND earning_type = 'trend_submission'
            ), 0)
        WHERE id = trend_record.spotter_id;
        
    ELSIF new_validation_status = 'rejected' AND trend_record.validation_status = 'pending' THEN
        -- Trend just got rejected - remove pending earnings
        DELETE FROM public.earnings_ledger 
        WHERE trend_submission_id = NEW.trend_submission_id 
          AND status = 'pending'
          AND earning_type = 'trend_submission';
        
        -- Update submitter's profile to remove pending earnings
        UPDATE public.profiles 
        SET 
            earnings_pending = GREATEST(0, COALESCE(earnings_pending, 0) - COALESCE((
                SELECT SUM(amount) FROM public.earnings_ledger 
                WHERE trend_submission_id = NEW.trend_submission_id 
                  AND earning_type = 'trend_submission'
                  AND status = 'pending'
            ), 0))
        WHERE id = trend_record.spotter_id;
    END IF;
    
    -- Always add validator earnings (they get paid regardless of final outcome)
    INSERT INTO public.earnings_ledger (
        user_id,
        trend_submission_id,
        amount,
        status,
        earning_type,
        notes,
        created_at
    ) VALUES (
        NEW.validator_id,
        NEW.trend_submission_id,
        0.10, -- Validator reward
        'approved', -- Validators get paid immediately
        'validation',
        'Validation: ' || NEW.vote || ' (counts: ' || new_approve_count || ' approve, ' || new_reject_count || ' reject)'
    );
    
    -- Update validator's approved earnings
    UPDATE public.profiles 
    SET earnings_approved = COALESCE(earnings_approved, 0) + 0.10
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Replace the old validator earnings trigger
DROP TRIGGER IF EXISTS add_validator_earnings_trigger ON trend_validations;
CREATE TRIGGER process_trend_validation_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION process_trend_validation();

-- 5. Function to update validation configuration (for scaling)
CREATE OR REPLACE FUNCTION update_validation_config(
    p_required_validations INTEGER,
    p_rejection_threshold INTEGER
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.validation_config 
    SET 
        required_validations = p_required_validations,
        rejection_threshold = p_rejection_threshold,
        updated_at = NOW()
    WHERE id = 1;
    
    -- Insert if not exists
    INSERT INTO public.validation_config (required_validations, rejection_threshold)
    SELECT p_required_validations, p_rejection_threshold
    WHERE NOT EXISTS (SELECT 1 FROM public.validation_config WHERE id = 1);
END;
$$ LANGUAGE plpgsql;

-- 6. Initialize validation counts for existing trends
UPDATE public.trend_submissions 
SET 
    approve_count = COALESCE((
        SELECT COUNT(*) FROM public.trend_validations 
        WHERE trend_submission_id = trend_submissions.id 
          AND (vote = 'approve' OR vote = 'valid' OR vote = TRUE)
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) FROM public.trend_validations 
        WHERE trend_submission_id = trend_submissions.id 
          AND (vote = 'reject' OR vote = 'invalid' OR vote = FALSE)
    ), 0),
    validation_status = CASE 
        WHEN COALESCE((
            SELECT COUNT(*) FROM public.trend_validations 
            WHERE trend_submission_id = trend_submissions.id 
              AND (vote = 'approve' OR vote = 'valid' OR vote = TRUE)
        ), 0) >= 1 THEN 'approved'
        WHEN COALESCE((
            SELECT COUNT(*) FROM public.trend_validations 
            WHERE trend_submission_id = trend_submissions.id 
              AND (vote = 'reject' OR vote = 'invalid' OR vote = FALSE)
        ), 0) >= 2 THEN 'rejected'
        ELSE 'pending'
    END
WHERE approve_count IS NULL OR reject_count IS NULL OR validation_status IS NULL;

-- 7. Grant permissions
GRANT SELECT, UPDATE ON public.validation_config TO authenticated;
GRANT EXECUTE ON FUNCTION update_validation_config(INTEGER, INTEGER) TO authenticated;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation_status ON public.trend_submissions(validation_status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_validation ON public.trend_submissions(spotter_id, validation_status);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_vote ON public.trend_validations(trend_submission_id, vote);

-- Comments
COMMENT ON TABLE public.validation_config IS 'Configurable validation thresholds for scalable trend approval/rejection';
COMMENT ON FUNCTION process_trend_validation() IS 'Processes trend validations and handles payouts based on configurable thresholds';
COMMENT ON FUNCTION update_validation_config(INTEGER, INTEGER) IS 'Updates validation configuration for scaling (e.g., update_validation_config(3, 5) for 3 approvals needed, 5 rejections to reject)';

-- Example usage to scale up:
-- SELECT update_validation_config(3, 5); -- Require 3 approvals, 5 rejections
-- SELECT update_validation_config(5, 8); -- Require 5 approvals, 8 rejections