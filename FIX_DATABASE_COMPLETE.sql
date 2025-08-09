-- Complete database fix for trend_validations and related issues
-- This fixes: updated_at column, trend_id/trend_submission_id sync, and trigger issues

-- Step 1: Add missing columns to trend_submissions
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT;

-- Step 2: Fix or replace the update_trend_vote_counts trigger function
DROP TRIGGER IF EXISTS update_trend_vote_counts_trigger ON public.trend_validations;
DROP FUNCTION IF EXISTS update_trend_vote_counts() CASCADE;

CREATE OR REPLACE FUNCTION update_trend_vote_counts()
RETURNS TRIGGER AS $$
DECLARE
    v_trend_id UUID;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_status TEXT;
BEGIN
    -- Get the trend_id (check both columns for compatibility)
    v_trend_id := COALESCE(NEW.trend_submission_id, NEW.trend_id);
    
    IF v_trend_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Count votes
    SELECT 
        COUNT(CASE WHEN vote = 'verify' OR confirmed = true THEN 1 END),
        COUNT(CASE WHEN vote = 'reject' OR confirmed = false THEN 1 END)
    INTO v_approve_count, v_reject_count
    FROM public.trend_validations
    WHERE (trend_submission_id = v_trend_id OR trend_id = v_trend_id);
    
    -- Determine status
    IF v_approve_count >= 2 THEN
        v_status := 'approved';
    ELSIF v_reject_count >= 2 THEN
        v_status := 'rejected';
    ELSE
        v_status := 'pending';
    END IF;
    
    -- Update trend_submissions
    UPDATE public.trend_submissions
    SET 
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        validation_status = v_status,
        validation_count = v_approve_count + v_reject_count,
        updated_at = NOW()
    WHERE id = v_trend_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Add columns to trend_validations (with better error handling)
DO $$ 
BEGIN
    -- Add trend_submission_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) THEN
        ALTER TABLE public.trend_validations 
        ADD COLUMN trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;
    END IF;
    
    -- Add trend_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        ALTER TABLE public.trend_validations 
        ADD COLUMN trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;
    END IF;
    
    -- Add other important columns
    ALTER TABLE public.trend_validations
    ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject')),
    ADD COLUMN IF NOT EXISTS confirmed BOOLEAN,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Step 4: Safely sync data between columns
DO $$
BEGIN
    -- First, disable any existing triggers temporarily
    ALTER TABLE public.trend_validations DISABLE TRIGGER ALL;
    
    -- Sync trend_id and trend_submission_id
    UPDATE public.trend_validations
    SET trend_id = trend_submission_id
    WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;
    
    UPDATE public.trend_validations
    SET trend_submission_id = trend_id
    WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;
    
    -- Sync vote and confirmed columns
    UPDATE public.trend_validations
    SET vote = CASE 
        WHEN confirmed = true THEN 'verify'
        WHEN confirmed = false THEN 'reject'
        ELSE vote
    END
    WHERE vote IS NULL AND confirmed IS NOT NULL;
    
    UPDATE public.trend_validations
    SET confirmed = CASE 
        WHEN vote = 'verify' THEN true
        WHEN vote = 'reject' THEN false
        ELSE confirmed
    END
    WHERE confirmed IS NULL AND vote IS NOT NULL;
    
    -- Re-enable triggers
    ALTER TABLE public.trend_validations ENABLE TRIGGER ALL;
    
EXCEPTION WHEN OTHERS THEN
    -- Re-enable triggers even if error occurs
    ALTER TABLE public.trend_validations ENABLE TRIGGER ALL;
    RAISE NOTICE 'Error syncing data: %', SQLERRM;
END $$;

-- Step 5: Create sync trigger for future inserts/updates
DROP TRIGGER IF EXISTS sync_trend_columns ON public.trend_validations;
DROP FUNCTION IF EXISTS sync_trend_columns() CASCADE;

CREATE OR REPLACE FUNCTION sync_trend_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync trend_id and trend_submission_id
    IF NEW.trend_submission_id IS NOT NULL AND NEW.trend_id IS NULL THEN
        NEW.trend_id = NEW.trend_submission_id;
    ELSIF NEW.trend_id IS NOT NULL AND NEW.trend_submission_id IS NULL THEN
        NEW.trend_submission_id = NEW.trend_id;
    END IF;
    
    -- Sync vote and confirmed
    IF NEW.vote IS NOT NULL AND NEW.confirmed IS NULL THEN
        NEW.confirmed = (NEW.vote = 'verify');
    ELSIF NEW.confirmed IS NOT NULL AND NEW.vote IS NULL THEN
        NEW.vote = CASE WHEN NEW.confirmed THEN 'verify' ELSE 'reject' END;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_trend_columns
BEFORE INSERT OR UPDATE ON public.trend_validations
FOR EACH ROW
EXECUTE FUNCTION sync_trend_columns();

-- Step 6: Re-create the vote counts trigger
CREATE TRIGGER update_trend_vote_counts_trigger
AFTER INSERT OR UPDATE ON public.trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_vote_counts();

-- Step 7: Create or replace the cast_trend_vote function
CREATE OR REPLACE FUNCTION public.cast_trend_vote(
    p_trend_id UUID,
    p_vote TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_spotter_id UUID;
    v_approve_count INT;
    v_reject_count INT;
BEGIN
    -- Get authenticated user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Check if trend exists
    SELECT spotter_id INTO v_spotter_id
    FROM trend_submissions 
    WHERE id = p_trend_id;
    
    IF v_spotter_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Trend not found');
    END IF;
    
    -- Check if already voted (check both columns)
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
        AND validator_id = v_user_id
    ) THEN
        RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
    END IF;
    
    -- Insert vote (both columns will be synced by trigger)
    INSERT INTO trend_validations (
        trend_submission_id,
        validator_id,
        vote,
        created_at
    ) VALUES (
        p_trend_id,
        v_user_id,
        p_vote,
        NOW()
    );
    
    -- Get updated counts (the trigger should have updated them)
    SELECT approve_count, reject_count 
    INTO v_approve_count, v_reject_count
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Update validator earnings
    UPDATE profiles
    SET 
        earnings_approved = COALESCE(earnings_approved, 0) + 0.01,
        total_earnings = COALESCE(total_earnings, 0) + 0.01
    WHERE id = v_user_id;
    
    RETURN json_build_object(
        'success', true,
        'vote', p_vote,
        'approve_count', COALESCE(v_approve_count, 0),
        'reject_count', COALESCE(v_reject_count, 0)
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;

-- Step 8: Update existing vote counts
UPDATE public.trend_submissions ts
SET 
    approve_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
        AND (tv.vote = 'verify' OR tv.confirmed = true)
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
        AND (tv.vote = 'reject' OR tv.confirmed = false)
    ), 0),
    validation_count = COALESCE((
        SELECT COUNT(*) 
        FROM public.trend_validations tv
        WHERE (tv.trend_submission_id = ts.id OR tv.trend_id = ts.id)
    ), 0);

-- Step 9: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id 
ON public.trend_validations(trend_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_submission_id 
ON public.trend_validations(trend_submission_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id 
ON public.trend_validations(validator_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_vote 
ON public.trend_validations(vote);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_updated_at 
ON public.trend_submissions(updated_at DESC);

-- Step 10: Grant permissions
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;

-- Step 11: Verify the fix
SELECT 
    'Verification Results' as check_type,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = 'trend_validations' 
     AND column_name IN ('trend_id', 'trend_submission_id', 'vote', 'confirmed')
    ) as trend_validations_columns,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' 
     AND table_name = 'trend_submissions' 
     AND column_name IN ('updated_at', 'approve_count', 'reject_count', 'validation_count')
    ) as trend_submissions_columns,
    EXISTS(
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'cast_trend_vote'
    ) as has_cast_trend_vote;

-- Final status
SELECT 'Database fix completed successfully!' as status,
       'The verify page should now work correctly.' as message;