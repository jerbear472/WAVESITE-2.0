-- First, check what columns we currently have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Add missing columns that the frontend is trying to send
-- These are all the fields from submitTrend.ts that might be missing

-- Add title column if it doesn't exist
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add intelligence fields
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_velocity TEXT DEFAULT 'just_starting';

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_size TEXT DEFAULT 'niche';

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS ai_angle TEXT DEFAULT 'not_ai';

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS sentiment INTEGER DEFAULT 50;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS audience_age TEXT[];

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS category_answers JSONB DEFAULT '{}';

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS velocity_metrics JSONB DEFAULT '{}';

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT false;

-- Add wave_score if missing
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS wave_score INTEGER DEFAULT 50;

-- Add quality_score if missing  
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS quality_score NUMERIC DEFAULT 75;

-- Add payment_amount if missing (for XP tracking)
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 10;

-- Add social media fields if missing
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS post_url TEXT;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS views_count BIGINT DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS likes_count BIGINT DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS comments_count BIGINT DEFAULT 0;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- Add platform if missing
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'other';

-- Check the columns again after adding
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Grant necessary permissions
GRANT ALL ON trend_submissions TO authenticated;
GRANT ALL ON trend_submissions TO service_role;

-- Ensure RLS policies allow inserts
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing insert policy if exists and recreate
DROP POLICY IF EXISTS "Users can insert their own trends" ON trend_submissions;

CREATE POLICY "Users can insert their own trends" ON trend_submissions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = spotter_id);

-- Drop existing select policy if exists and recreate  
DROP POLICY IF EXISTS "Users can view their own trends" ON trend_submissions;

CREATE POLICY "Users can view their own trends" ON trend_submissions
FOR SELECT TO authenticated
USING (auth.uid() = spotter_id);

-- Check if we have the necessary indexes
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON trend_submissions(status);