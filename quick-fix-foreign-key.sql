-- Quick fix to remove the foreign key constraint
-- Run this single command in Supabase SQL Editor

ALTER TABLE public.trend_submissions 
DROP CONSTRAINT trend_submissions_spotter_id_fkey CASCADE;

-- Verify it worked
SELECT 'Foreign key constraint removed! Try submitting a trend now.' as message;