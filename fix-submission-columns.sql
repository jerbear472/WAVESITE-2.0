-- Fix trend_submissions table to ensure all columns have proper defaults
-- This will prevent submission errors

-- Add missing columns with defaults if they don't exist
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS virality_prediction INTEGER DEFAULT 5;

ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 0.50;

ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0;

ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'submitted';

ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make evidence column nullable if it isn't already
ALTER TABLE public.trend_submissions 
ALTER COLUMN evidence DROP NOT NULL;

-- Make screenshot_url nullable
ALTER TABLE public.trend_submissions 
ALTER COLUMN screenshot_url DROP NOT NULL;

-- Ensure description has a default
ALTER TABLE public.trend_submissions 
ALTER COLUMN description SET DEFAULT 'No description provided';

-- Update any NULL values in existing rows
UPDATE public.trend_submissions 
SET 
  virality_prediction = COALESCE(virality_prediction, 5),
  quality_score = COALESCE(quality_score, 0.50),
  validation_count = COALESCE(validation_count, 0),
  status = COALESCE(status, 'submitted'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE virality_prediction IS NULL 
   OR quality_score IS NULL 
   OR validation_count IS NULL 
   OR status IS NULL;

-- Create a simplified insert policy
DROP POLICY IF EXISTS "Simple insert for authenticated" ON public.trend_submissions;
CREATE POLICY "Simple insert for authenticated" ON public.trend_submissions
FOR INSERT TO authenticated
WITH CHECK (true);

-- Test the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;