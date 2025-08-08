-- Fix Vote Count Synchronization Between Tables
-- This ensures vote counts are properly tracked and synced

-- 1. First ensure the columns exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- 2. Ensure trend_validations has proper vote column
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject'));

-- 3. Create or replace function to update counts when a vote is cast
CREATE OR REPLACE FUNCTION public.update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
BEGIN
    -- Calculate current vote counts
    SELECT 
        COUNT(*) FILTER (WHERE vote = 'verify'),
        COUNT(*) FILTER (WHERE vote = 'reject')
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id);
    
    -- Determine validation status based on rules:
    -- 1 approve vote = validated/approved
    -- 2 reject votes = rejected
    IF v_approve_count >= 1 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update the trend_submissions table
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        validation_count = v_approve_count + v_reject_count
    WHERE id = COALESCE(NEW.trend_id, OLD.trend_id);
    
    -- If status changed to approved, handle earnings
    IF v_status = 'approved' AND v_approve_count = 1 THEN
        -- Pay the validator who approved (0.05 for validation)
        IF TG_OP = 'INSERT' AND NEW.vote = 'verify' THEN
            INSERT INTO public.earnings_ledger (
                user_id,
                amount,
                type,
                description,
                trend_id,
                status
            ) VALUES (
                NEW.validator_id,
                0.05,
                'validation',
                'Trend validation reward',
                NEW.trend_id,
                'approved'
            );
        END IF;
        
        -- Pay the trend spotter (amount based on quality)
        UPDATE public.trend_submissions
        SET bounty_paid = true
        WHERE id = COALESCE(NEW.trend_id, OLD.trend_id)
        AND bounty_paid = false;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for vote count updates
DROP TRIGGER IF EXISTS update_vote_counts_on_validation ON public.trend_validations;
CREATE TRIGGER update_vote_counts_on_validation
    AFTER INSERT OR UPDATE OR DELETE ON public.trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_trend_vote_counts();

-- 5. Sync existing data
UPDATE public.trend_submissions ts
SET 
    approve_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE tv.trend_id = ts.id 
        AND tv.vote = 'verify'
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE tv.trend_id = ts.id 
        AND tv.vote = 'reject'
    ), 0),
    validation_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE tv.trend_id = ts.id
    ), 0);

-- 6. Update validation status based on current counts
UPDATE public.trend_submissions
SET validation_status = CASE
    WHEN approve_count >= 1 THEN 'approved'
    WHEN reject_count >= 2 THEN 'rejected'
    ELSE 'pending'
END;

-- 7. Create index for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_vote 
ON public.trend_validations(trend_id, vote);

-- 8. Grant permissions
GRANT SELECT ON public.trend_validations TO authenticated;
GRANT INSERT ON public.trend_validations TO authenticated;
GRANT UPDATE ON public.trend_submissions TO authenticated;

-- 9. Create view for easy trend status querying
CREATE OR REPLACE VIEW public.trend_vote_summary AS
SELECT 
    ts.id,
    ts.spotter_id,
    ts.category,
    ts.description,
    ts.approve_count,
    ts.reject_count,
    ts.validation_status,
    ts.validation_count,
    ts.created_at,
    ts.bounty_amount,
    ts.bounty_paid,
    COUNT(DISTINCT tv.validator_id) as unique_validators,
    ARRAY_AGG(DISTINCT tv.validator_id) FILTER (WHERE tv.vote = 'verify') as approvers,
    ARRAY_AGG(DISTINCT tv.validator_id) FILTER (WHERE tv.vote = 'reject') as rejecters
FROM public.trend_submissions ts
LEFT JOIN public.trend_validations tv ON ts.id = tv.trend_id
GROUP BY ts.id;

GRANT SELECT ON public.trend_vote_summary TO authenticated;

-- Display completion message
DO $$
BEGIN
    RAISE NOTICE 'Vote count synchronization setup complete!';
    RAISE NOTICE 'Rules: 1 approve vote = validated, 2 reject votes = rejected';
END $$;