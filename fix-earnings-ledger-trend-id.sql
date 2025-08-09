-- Fix the earnings_ledger column reference issue
-- The earnings_ledger table uses 'trend_submission_id' not 'trend_id'

-- First, check if we need to add the trend_id column or fix the function
DO $$
BEGIN
    -- Check if trend_submission_id column exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'trend_submission_id'
    ) THEN
        RAISE NOTICE 'trend_submission_id column exists in earnings_ledger';
        
        -- Fix the vote count sync function to use the correct column name
        CREATE OR REPLACE FUNCTION sync_vote_counts()
        RETURNS TRIGGER AS $$
        DECLARE
            v_approve_count INT;
            v_reject_count INT;
            v_status TEXT;
        BEGIN
            -- Calculate current vote counts
            SELECT 
                COUNT(CASE WHEN vote = 'verify' THEN 1 END),
                COUNT(CASE WHEN vote = 'reject' THEN 1 END)
            INTO v_approve_count, v_reject_count
            FROM public.trend_validations
            WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id);
            
            -- Determine status based on vote counts
            IF v_approve_count >= 1 THEN
                v_status := 'approved';
            ELSIF v_reject_count >= 3 THEN
                v_status := 'rejected';
            ELSE
                v_status := 'pending';
            END IF;
            
            -- Update the trend submission
            UPDATE public.trend_submissions
            SET 
                approve_count = v_approve_count,
                reject_count = v_reject_count,
                status = v_status,
                updated_at = NOW()
            WHERE id = COALESCE(NEW.trend_id, OLD.trend_id);
            
            -- If status changed to approved, handle earnings
            IF v_status = 'approved' AND v_approve_count = 1 THEN
                -- Pay the validator who approved (0.05 for validation)
                IF TG_OP = 'INSERT' AND NEW.vote = 'verify' THEN
                    -- Check if earnings_ledger table exists
                    IF EXISTS (
                        SELECT 1 
                        FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = 'earnings_ledger'
                    ) THEN
                        INSERT INTO public.earnings_ledger (
                            user_id,
                            amount,
                            type,
                            description,
                            trend_submission_id,  -- FIXED: Use correct column name
                            status
                        ) VALUES (
                            NEW.validator_id,
                            0.05,
                            'validation',
                            'Trend validation reward',
                            NEW.trend_id,  -- This maps to trend_submission_id
                            'approved'
                        )
                        ON CONFLICT DO NOTHING;  -- Prevent duplicate earnings
                    END IF;
                END IF;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Fixed sync_vote_counts function to use trend_submission_id';
        
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'trend_id'
    ) THEN
        -- If trend_id exists instead, we use that
        RAISE NOTICE 'trend_id column exists in earnings_ledger - no changes needed';
    ELSE
        -- Neither column exists, add trend_submission_id
        ALTER TABLE public.earnings_ledger 
        ADD COLUMN IF NOT EXISTS trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_submission_id 
        ON public.earnings_ledger(trend_submission_id);
        
        RAISE NOTICE 'Added trend_submission_id column to earnings_ledger';
        
        -- Now fix the function
        CREATE OR REPLACE FUNCTION sync_vote_counts()
        RETURNS TRIGGER AS $$
        DECLARE
            v_approve_count INT;
            v_reject_count INT;
            v_status TEXT;
        BEGIN
            -- Calculate current vote counts
            SELECT 
                COUNT(CASE WHEN vote = 'verify' THEN 1 END),
                COUNT(CASE WHEN vote = 'reject' THEN 1 END)
            INTO v_approve_count, v_reject_count
            FROM public.trend_validations
            WHERE trend_id = COALESCE(NEW.trend_id, OLD.trend_id);
            
            -- Determine status based on vote counts
            IF v_approve_count >= 1 THEN
                v_status := 'approved';
            ELSIF v_reject_count >= 3 THEN
                v_status := 'rejected';
            ELSE
                v_status := 'pending';
            END IF;
            
            -- Update the trend submission
            UPDATE public.trend_submissions
            SET 
                approve_count = v_approve_count,
                reject_count = v_reject_count,
                status = v_status,
                updated_at = NOW()
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
                        trend_submission_id,
                        status
                    ) VALUES (
                        NEW.validator_id,
                        0.05,
                        'validation',
                        'Trend validation reward',
                        NEW.trend_id,
                        'approved'
                    )
                    ON CONFLICT DO NOTHING;
                END IF;
            END IF;
            
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        
        RAISE NOTICE 'Fixed sync_vote_counts function to use trend_submission_id';
    END IF;
END $$;

-- Also check and fix any other functions that might be using trend_id incorrectly
-- Fix the add_pending_earnings_on_submission function if it exists
CREATE OR REPLACE FUNCTION add_pending_earnings_on_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if earnings_ledger table exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger'
    ) THEN
        -- Add 10 cents pending earning
        INSERT INTO public.earnings_ledger (
            user_id,
            trend_submission_id,  -- Use correct column name
            amount,
            status,
            earning_type,
            notes
        ) VALUES (
            NEW.spotter_id,
            NEW.id,
            0.10,
            'pending',
            'submission',
            'Earned for trend submission'
        )
        ON CONFLICT DO NOTHING;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Make sure the trigger exists
DROP TRIGGER IF EXISTS trigger_add_trend_earning ON public.trend_submissions;
CREATE TRIGGER trigger_add_trend_earning
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION add_pending_earnings_on_submission();

-- Verify the fix
SELECT 
    'Earnings ledger fix applied successfully' as status,
    EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger' 
        AND column_name = 'trend_submission_id'
    ) as has_trend_submission_id_column;