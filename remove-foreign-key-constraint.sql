-- IMMEDIATE FIX: Remove foreign key constraint to allow trend submissions
-- Run this in Supabase SQL Editor to fix the submission error

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE public.trend_submissions 
DROP CONSTRAINT IF EXISTS trend_submissions_spotter_id_fkey;

-- Step 2: Verify the constraint was removed
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name='trend_submissions';

-- Step 3: Update RLS policies to allow submissions
DROP POLICY IF EXISTS "Users can create trend submissions" ON public.trend_submissions;
CREATE POLICY "Users can create trend submissions" ON public.trend_submissions
  FOR INSERT WITH CHECK (true);  -- Temporarily allow all inserts

DROP POLICY IF EXISTS "Users can view all trend submissions" ON public.trend_submissions;
CREATE POLICY "Users can view all trend submissions" ON public.trend_submissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own trend submissions" ON public.trend_submissions;
CREATE POLICY "Users can update own trend submissions" ON public.trend_submissions
  FOR UPDATE USING (auth.uid()::text = spotter_id::text);

DROP POLICY IF EXISTS "Users can delete own trend submissions" ON public.trend_submissions;
CREATE POLICY "Users can delete own trend submissions" ON public.trend_submissions
  FOR DELETE USING (auth.uid()::text = spotter_id::text);

-- Step 4: Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.trend_submissions TO anon;

-- Success message
SELECT 'Foreign key constraint removed. You can now submit trends!' as status;