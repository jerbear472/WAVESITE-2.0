-- Ensure all required columns exist in trend_submissions table
-- This script adds any missing columns without affecting existing data

-- Add social media metadata columns if they don't exist
DO $$ 
BEGIN
    -- Add creator_handle if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'creator_handle') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_handle TEXT;
    END IF;

    -- Add creator_name if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'creator_name') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_name TEXT;
    END IF;

    -- Add post_caption if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'post_caption') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_caption TEXT;
    END IF;

    -- Add likes_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'likes_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;

    -- Add comments_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'comments_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;

    -- Add shares_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'shares_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;

    -- Add views_count if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'views_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;

    -- Add hashtags if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'hashtags') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
    END IF;

    -- Add post_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'post_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_url TEXT;
    END IF;

    -- Add thumbnail_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Add posted_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'posted_at') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN posted_at TIMESTAMPTZ;
    END IF;

    -- Add quality_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'quality_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
    END IF;

    -- Note: wave_score is calculated by the system later, not set during submission

    -- Add screenshot_url if missing (for backward compatibility)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'screenshot_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN screenshot_url TEXT;
    END IF;

    -- Add trend_umbrella_id if missing (optional)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'trend_umbrella_id') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN trend_umbrella_id UUID;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_platform ON public.trend_submissions((evidence->>'platform'));
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);

-- Ensure RLS is enabled
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    -- Drop existing policies to avoid conflicts
    DROP POLICY IF EXISTS "Users can view own submissions" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Users can create submissions" ON public.trend_submissions;
    DROP POLICY IF EXISTS "Users can update own submissions" ON public.trend_submissions;
    
    -- Create new policies
    CREATE POLICY "Users can view own submissions"
        ON public.trend_submissions
        FOR SELECT
        USING (auth.uid() = spotter_id);
    
    CREATE POLICY "Users can create submissions"
        ON public.trend_submissions
        FOR INSERT
        WITH CHECK (auth.uid() = spotter_id);
    
    CREATE POLICY "Users can update own submissions"
        ON public.trend_submissions
        FOR UPDATE
        USING (auth.uid() = spotter_id);
END $$;

-- Grant necessary permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Add comment to table
COMMENT ON TABLE public.trend_submissions IS 'Stores all trend submissions with social media metadata';