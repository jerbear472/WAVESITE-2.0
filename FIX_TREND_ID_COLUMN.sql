-- Fix the trend_validations table column naming issue
-- The function cast_trend_vote expects 'trend_submission_id' but the table has 'trend_id'

-- Step 1: Check current state of the table
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_validations'
AND column_name IN ('trend_id', 'trend_submission_id')
ORDER BY column_name;

-- Step 2: Add trend_submission_id column if it doesn't exist
DO $$ 
BEGIN
    -- Check if trend_submission_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) THEN
        -- Check if trend_id column exists
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'trend_validations' 
            AND column_name = 'trend_id'
        ) THEN
            -- Rename trend_id to trend_submission_id
            ALTER TABLE public.trend_validations 
            RENAME COLUMN trend_id TO trend_submission_id;
            
            RAISE NOTICE 'Renamed column trend_id to trend_submission_id';
        ELSE
            -- Add new column if neither exists
            ALTER TABLE public.trend_validations 
            ADD COLUMN trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;
            
            RAISE NOTICE 'Added new column trend_submission_id';
        END IF;
    ELSE
        RAISE NOTICE 'Column trend_submission_id already exists';
    END IF;
END $$;

-- Step 3: Add vote column if it doesn't exist
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject'));

-- Step 4: Migrate data from confirmed column to vote column if needed
UPDATE public.trend_validations
SET vote = CASE 
    WHEN confirmed = true THEN 'verify'
    WHEN confirmed = false THEN 'reject'
    ELSE NULL
END
WHERE vote IS NULL AND confirmed IS NOT NULL;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_submission_id 
ON public.trend_validations(trend_submission_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id 
ON public.trend_validations(validator_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_vote 
ON public.trend_validations(vote);

-- Step 6: Ensure the cast_trend_vote function exists
-- (It should already exist from CREATE_MISSING_VOTE_FUNCTION.sql)
-- If not, run that file first

-- Step 7: Verify the fix
SELECT 
    'Verification Results' as check_type,
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

-- Step 8: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Final message
SELECT 'Database fix completed. The trend_validations table now has trend_submission_id column.' as status;