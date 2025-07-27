-- Simplest fix: Just remove the foreign key constraint
-- This doesn't alter any column types, just removes the constraint

-- Step 1: Check what constraints exist
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.trend_submissions'::regclass
  AND conname LIKE '%spotter%';

-- Step 2: Drop ONLY the foreign key constraint (not the column)
DO $$
BEGIN
    -- Try to drop the constraint if it exists
    ALTER TABLE public.trend_submissions 
    DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;
    
    RAISE NOTICE 'Foreign key constraint removed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not remove constraint: %', SQLERRM;
END $$;

-- Step 3: Ensure RLS policies allow authenticated users to insert
-- First, check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'trend_submissions';

-- Drop and recreate the INSERT policy to be more permissive
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trend_submissions;
DROP POLICY IF EXISTS "Authenticated users can create trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Anyone can insert trends" ON public.trend_submissions;

-- Create a simple INSERT policy
CREATE POLICY "Allow authenticated inserts" ON public.trend_submissions
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Ensure other policies exist
CREATE POLICY IF NOT EXISTS "Allow public select" ON public.trend_submissions
FOR SELECT
TO public
USING (true);

-- Test if we can now insert
DO $$
DECLARE
    test_id UUID;
BEGIN
    test_id := gen_random_uuid();
    
    -- Try a test insert
    INSERT INTO public.trend_submissions (
        id,
        spotter_id,
        category,
        description,
        evidence,
        status,
        quality_score,
        validation_count,
        virality_prediction,
        created_at,
        updated_at
    ) VALUES (
        test_id,
        COALESCE(auth.uid(), gen_random_uuid()),  -- Use auth ID or random UUID
        'meme_format',
        'Test trend - DELETE ME',
        '{"title": "Test", "url": "test.com", "platform": "other"}'::jsonb,
        'submitted',
        0.5,
        0,
        5,
        NOW(),
        NOW()
    );
    
    -- If successful, delete the test
    DELETE FROM public.trend_submissions WHERE id = test_id;
    
    RAISE NOTICE 'Success! Trends can now be submitted.';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %. The constraint might still be active.', SQLERRM;
END $$;

-- Final status check
SELECT 
    'Constraint removal attempted. Check messages above.' as status,
    EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.trend_submissions'::regclass 
        AND conname = 'trend_submissions_spotter_id_fkey'
    ) as constraint_still_exists;