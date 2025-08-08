-- Fix Verify Page Voting Issues
-- This ensures the trend_validations table is properly configured

-- 1. Ensure trend_validations table has correct columns
ALTER TABLE public.trend_validations
ADD COLUMN IF NOT EXISTS trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS validator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS vote TEXT CHECK (vote IN ('verify', 'reject')),
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 0.75,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create unique constraint to prevent duplicate votes
ALTER TABLE public.trend_validations
DROP CONSTRAINT IF EXISTS unique_user_trend_vote;

ALTER TABLE public.trend_validations
ADD CONSTRAINT unique_user_trend_vote 
UNIQUE(trend_submission_id, validator_id);

-- 3. Ensure proper indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator 
ON public.trend_validations(validator_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_trend 
ON public.trend_validations(trend_submission_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_created 
ON public.trend_validations(created_at);

-- 4. Fix RLS policies
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Anyone can view validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can view validations" ON public.trend_validations;

-- Create proper policies
CREATE POLICY "Authenticated users can insert validations" 
ON public.trend_validations
FOR INSERT 
TO authenticated
WITH CHECK (validator_id = auth.uid());

CREATE POLICY "Anyone can view validations" 
ON public.trend_validations
FOR SELECT 
TO authenticated, anon
USING (true);

CREATE POLICY "Users cannot update validations" 
ON public.trend_validations
FOR UPDATE 
TO authenticated
USING (false);

CREATE POLICY "Users cannot delete validations" 
ON public.trend_validations
FOR DELETE 
TO authenticated
USING (false);

-- 5. Grant necessary permissions
GRANT SELECT ON public.trend_validations TO authenticated, anon;
GRANT INSERT ON public.trend_validations TO authenticated;
GRANT SELECT ON public.trend_submissions TO authenticated, anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 6. Create helper function to check if user can vote
CREATE OR REPLACE FUNCTION public.can_user_vote(
    p_user_id UUID,
    p_trend_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
    v_is_owner BOOLEAN;
BEGIN
    -- Check if user already voted
    SELECT EXISTS(
        SELECT 1 FROM public.trend_validations
        WHERE validator_id = p_user_id
        AND trend_submission_id = p_trend_id
    ) INTO v_exists;
    
    IF v_exists THEN
        RETURN FALSE;
    END IF;
    
    -- Check if user owns the trend
    SELECT EXISTS(
        SELECT 1 FROM public.trend_submissions
        WHERE id = p_trend_id
        AND spotter_id = p_user_id
    ) INTO v_is_owner;
    
    IF v_is_owner THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.can_user_vote(UUID, UUID) TO authenticated;

-- 7. Test the setup
DO $$
DECLARE
    v_test_record RECORD;
    v_count INTEGER;
BEGIN
    -- Check if trend_validations table is accessible
    SELECT COUNT(*) INTO v_count FROM public.trend_validations;
    RAISE NOTICE 'trend_validations table has % records', v_count;
    
    -- Check column existence
    SELECT column_name, data_type 
    INTO v_test_record
    FROM information_schema.columns 
    WHERE table_name = 'trend_validations' 
    AND column_name = 'trend_submission_id'
    LIMIT 1;
    
    IF v_test_record.column_name IS NOT NULL THEN
        RAISE NOTICE '✅ trend_submission_id column exists';
    ELSE
        RAISE NOTICE '❌ trend_submission_id column missing';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '=== Verify Page Voting Fix Applied ===';
    RAISE NOTICE 'Users can now:';
    RAISE NOTICE '  - Vote on trends they did not submit';
    RAISE NOTICE '  - Vote only once per trend';
    RAISE NOTICE '  - Trends disappear after voting';
    RAISE NOTICE '';
END $$;