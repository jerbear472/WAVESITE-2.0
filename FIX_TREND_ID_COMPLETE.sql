-- Complete fix for trend_id column issue
-- The problem: Some code expects 'trend_id' while others expect 'trend_submission_id'
-- Solution: Add BOTH columns and keep them in sync

-- Step 1: Check current columns
SELECT 
    'Current columns in trend_validations' as check_type,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_validations'
AND column_name IN ('trend_id', 'trend_submission_id')
ORDER BY column_name;

-- Step 2: Add missing columns without breaking existing data
DO $$ 
BEGIN
    -- Add trend_submission_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) THEN
        ALTER TABLE public.trend_validations 
        ADD COLUMN trend_submission_id UUID;
        
        -- Copy from trend_id if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_validations' 
            AND column_name = 'trend_id'
        ) THEN
            UPDATE public.trend_validations 
            SET trend_submission_id = trend_id
            WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;
        END IF;
        
        -- Add foreign key
        ALTER TABLE public.trend_validations 
        ADD CONSTRAINT fk_trend_submission_id 
        FOREIGN KEY (trend_submission_id) 
        REFERENCES public.trend_submissions(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added trend_submission_id column';
    END IF;
    
    -- Add trend_id if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        ALTER TABLE public.trend_validations 
        ADD COLUMN trend_id UUID;
        
        -- Copy from trend_submission_id if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_validations' 
            AND column_name = 'trend_submission_id'
        ) THEN
            UPDATE public.trend_validations 
            SET trend_id = trend_submission_id
            WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;
        END IF;
        
        -- Add foreign key
        ALTER TABLE public.trend_validations 
        ADD CONSTRAINT fk_trend_id 
        FOREIGN KEY (trend_id) 
        REFERENCES public.trend_submissions(id) 
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added trend_id column';
    END IF;
END $$;

-- Step 3: Ensure both columns stay in sync
-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_trend_id_columns ON public.trend_validations;
DROP FUNCTION IF EXISTS sync_trend_id_columns();

-- Create function to keep columns in sync
CREATE OR REPLACE FUNCTION sync_trend_id_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Keep trend_id and trend_submission_id in sync
    IF NEW.trend_submission_id IS NOT NULL AND NEW.trend_id IS NULL THEN
        NEW.trend_id = NEW.trend_submission_id;
    ELSIF NEW.trend_id IS NOT NULL AND NEW.trend_submission_id IS NULL THEN
        NEW.trend_submission_id = NEW.trend_id;
    ELSIF NEW.trend_id IS NOT NULL AND NEW.trend_submission_id IS NOT NULL THEN
        -- If both are set, ensure they match
        IF NEW.trend_id != NEW.trend_submission_id THEN
            RAISE EXCEPTION 'trend_id and trend_submission_id must match';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to sync columns
CREATE TRIGGER sync_trend_id_columns
BEFORE INSERT OR UPDATE ON public.trend_validations
FOR EACH ROW
EXECUTE FUNCTION sync_trend_id_columns();

-- Step 4: Add other missing columns that might be needed
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject')),
ADD COLUMN IF NOT EXISTS confirmed BOOLEAN,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.50,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Step 5: Migrate data from confirmed to vote if needed
UPDATE public.trend_validations
SET vote = CASE 
    WHEN confirmed = true THEN 'verify'
    WHEN confirmed = false THEN 'reject'
    ELSE vote
END
WHERE vote IS NULL AND confirmed IS NOT NULL;

-- Step 6: Update any NULL trend_id or trend_submission_id
UPDATE public.trend_validations
SET trend_id = trend_submission_id
WHERE trend_id IS NULL AND trend_submission_id IS NOT NULL;

UPDATE public.trend_validations
SET trend_submission_id = trend_id
WHERE trend_submission_id IS NULL AND trend_id IS NOT NULL;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id 
ON public.trend_validations(trend_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_submission_id 
ON public.trend_validations(trend_submission_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id 
ON public.trend_validations(validator_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_vote 
ON public.trend_validations(vote);

-- Step 8: Ensure the cast_trend_vote function exists
-- Check if it exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'cast_trend_vote'
    ) THEN
        -- Create it if it doesn't exist
        CREATE OR REPLACE FUNCTION public.cast_trend_vote(
            p_trend_id UUID,
            p_vote TEXT
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $func$
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
            
            -- Check if trend exists and get spotter
            SELECT spotter_id INTO v_spotter_id
            FROM trend_submissions 
            WHERE id = p_trend_id;
            
            IF v_spotter_id IS NULL THEN
                RETURN json_build_object('success', false, 'error', 'Trend not found');
            END IF;
            
            -- Check if already voted (check both columns for compatibility)
            IF EXISTS (
                SELECT 1 FROM trend_validations 
                WHERE (trend_submission_id = p_trend_id OR trend_id = p_trend_id)
                AND validator_id = v_user_id
            ) THEN
                RETURN json_build_object('success', false, 'error', 'Already voted on this trend');
            END IF;
            
            -- Insert vote (set both columns for compatibility)
            INSERT INTO trend_validations (
                trend_submission_id,
                trend_id,
                validator_id,
                vote,
                confirmed,
                created_at
            ) VALUES (
                p_trend_id,
                p_trend_id,
                v_user_id,
                p_vote,
                CASE WHEN p_vote = 'verify' THEN true ELSE false END,
                NOW()
            );
            
            -- Update counts on trend
            IF p_vote = 'verify' THEN
                UPDATE trend_submissions
                SET 
                    approve_count = COALESCE(approve_count, 0) + 1,
                    validation_count = COALESCE(validation_count, 0) + 1
                WHERE id = p_trend_id
                RETURNING approve_count INTO v_approve_count;
            ELSE
                UPDATE trend_submissions
                SET 
                    reject_count = COALESCE(reject_count, 0) + 1,
                    validation_count = COALESCE(validation_count, 0) + 1
                WHERE id = p_trend_id
                RETURNING reject_count INTO v_reject_count;
            END IF;
            
            -- Get final counts
            SELECT approve_count, reject_count 
            INTO v_approve_count, v_reject_count
            FROM trend_submissions
            WHERE id = p_trend_id;
            
            -- Update profiles earnings for validator
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
        $func$;
        
        RAISE NOTICE 'Created cast_trend_vote function';
    END IF;
END $$;

-- Step 9: Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.profiles TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO authenticated;
GRANT EXECUTE ON FUNCTION public.cast_trend_vote TO anon;

-- Step 10: Verify the fix
SELECT 
    'Final verification' as check_type,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) as has_trend_id,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) as has_trend_submission_id,
    EXISTS(
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'vote'
    ) as has_vote_column,
    EXISTS(
        SELECT 1 FROM information_schema.routines
        WHERE routine_schema = 'public'
        AND routine_name = 'cast_trend_vote'
    ) as has_cast_trend_vote_function;

-- Final message
SELECT 'Database fix completed. Both trend_id and trend_submission_id columns now exist and are kept in sync.' as status;