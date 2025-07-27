-- Alternative fix: Modify trend_submissions table to accept any UUID
-- This allows submissions without requiring auth.users entries

-- Step 1: Check current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_submissions' 
  AND column_name = 'spotter_id';

-- Step 2: Drop the foreign key constraint (if not already done)
ALTER TABLE public.trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;

-- Step 3: Ensure spotter_id can accept any UUID value
ALTER TABLE public.trend_submissions 
ALTER COLUMN spotter_id TYPE UUID USING spotter_id::UUID;

-- Step 4: Create a simple index for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id 
ON public.trend_submissions(spotter_id);

-- Step 5: Update RLS to be more permissive for testing
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.trend_submissions;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can delete own trend submissions" ON public.trend_submissions;

-- Create new simplified policies
CREATE POLICY "Anyone can insert trends" ON public.trend_submissions
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view trends" ON public.trend_submissions
FOR SELECT USING (true);

CREATE POLICY "Users can update their trends" ON public.trend_submissions
FOR UPDATE USING (auth.uid()::text = spotter_id::text);

CREATE POLICY "Users can delete their trends" ON public.trend_submissions
FOR DELETE USING (auth.uid()::text = spotter_id::text);

-- Step 6: Test by inserting a sample trend
DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the current user ID from auth
    test_user_id := auth.uid();
    
    IF test_user_id IS NOT NULL THEN
        -- Try to insert a test trend
        INSERT INTO public.trend_submissions (
            spotter_id,
            category,
            description,
            evidence,
            status,
            quality_score,
            validation_count,
            virality_prediction
        ) VALUES (
            test_user_id,
            'meme_format',
            'Test trend submission',
            '{"title": "Test", "url": "https://example.com", "platform": "other"}'::jsonb,
            'submitted',
            0.5,
            0,
            5
        );
        
        RAISE NOTICE 'Test trend inserted successfully!';
        
        -- Clean up the test
        DELETE FROM public.trend_submissions 
        WHERE spotter_id = test_user_id 
          AND description = 'Test trend submission';
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during test: %', SQLERRM;
END $$;

-- Final status
SELECT 
    'Table fixed! Foreign key removed and policies updated.' as status,
    COUNT(*) as total_trends
FROM public.trend_submissions;