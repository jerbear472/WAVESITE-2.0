-- Ensure all social media metadata columns exist in trend_submissions table
-- This script is safe to run multiple times - it only adds columns if they don't exist

-- Add social media metadata columns
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS creator_handle TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS post_caption TEXT,
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS hashtags TEXT[],
ADD COLUMN IF NOT EXISTS post_url TEXT,
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;

-- Add platform column if it doesn't exist (sometimes stored in evidence JSON)
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Add screenshot_url if it doesn't exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Add bounty_paid column if it doesn't exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS bounty_paid BOOLEAN DEFAULT FALSE;

-- Create trend_validations table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trend_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    confirmed BOOLEAN NOT NULL,
    confidence_score DECIMAL(3,2),
    notes TEXT,
    evidence_url TEXT,
    reward_amount DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);

-- Enable RLS on trend_validations
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can create their own validations" ON public.trend_validations;
DROP POLICY IF EXISTS "Users can view all validations" ON public.trend_validations;

-- RLS Policies for trend_validations
CREATE POLICY "Users can create their own validations" ON public.trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can view all validations" ON public.trend_validations
    FOR SELECT USING (true);

-- Update RLS policies for trend_submissions to allow viewing trends that need validation
DROP POLICY IF EXISTS "Anyone can view approved trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view their own submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can view trends for validation" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can submit trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update their own trends" ON public.trend_submissions;

-- Create new, more comprehensive policies
CREATE POLICY "Users can view their own submissions" ON public.trend_submissions
    FOR SELECT USING (auth.uid() = spotter_id);

CREATE POLICY "Users can view trends for validation" ON public.trend_submissions
    FOR SELECT USING (
        status IN ('submitted', 'validating', 'approved', 'viral') 
        AND auth.uid() IS NOT NULL
    );

CREATE POLICY "Users can submit trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update their own trends" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);

-- Create a function to update trend status based on validation count
CREATE OR REPLACE FUNCTION update_trend_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the trend status based on validation count
    UPDATE public.trend_submissions
    SET status = CASE 
        WHEN validation_count >= 5 THEN 'approved'::trend_status
        WHEN validation_count >= 1 THEN 'validating'::trend_status
        ELSE status
    END
    WHERE id = NEW.trend_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update trend status
DROP TRIGGER IF EXISTS update_trend_status_trigger ON public.trend_validations;
CREATE TRIGGER update_trend_status_trigger
AFTER INSERT ON public.trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_status();

-- Grant necessary permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.trend_validations TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;