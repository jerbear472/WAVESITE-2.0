-- IMMEDIATE FIX FOR "column trend_id of relation earnings_ledger does not exist" ERROR
-- Run this in Supabase SQL Editor to fix the trend submission error

-- Step 1: Add the missing trend_id column to earnings_ledger as an alias to trend_submission_id
ALTER TABLE public.earnings_ledger 
ADD COLUMN IF NOT EXISTS trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE;

-- Step 2: Copy any existing trend_submission_id values to trend_id
UPDATE public.earnings_ledger 
SET trend_id = trend_submission_id 
WHERE trend_submission_id IS NOT NULL AND trend_id IS NULL;

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_id 
ON public.earnings_ledger(trend_id);

-- Step 4: Verify the fix
SELECT 
    'Fix applied successfully!' as status,
    COUNT(*) as total_records,
    COUNT(trend_id) as records_with_trend_id,
    COUNT(trend_submission_id) as records_with_trend_submission_id
FROM public.earnings_ledger;

-- Note: This creates trend_id as an additional column alongside trend_submission_id
-- Both columns will work, preventing any code that uses either name from breaking