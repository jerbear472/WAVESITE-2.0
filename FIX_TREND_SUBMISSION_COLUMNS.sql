-- Fix trend_submissions table columns to match web app requirements
-- This script ensures all required columns exist with proper types

-- First, check and add missing columns if they don't exist
DO $$
BEGIN
    -- Add screenshot_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'screenshot_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN screenshot_url TEXT;
        RAISE NOTICE 'Added screenshot_url column';
    END IF;

    -- Add post_url if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'post_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_url TEXT;
        RAISE NOTICE 'Added post_url column';
    END IF;

    -- Add wave_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'wave_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN wave_score INTEGER DEFAULT 50 CHECK (wave_score >= 0 AND wave_score <= 100);
        RAISE NOTICE 'Added wave_score column';
    END IF;

    -- Add social media metadata columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'creator_handle') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_handle TEXT;
        RAISE NOTICE 'Added creator_handle column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'creator_name') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_name TEXT;
        RAISE NOTICE 'Added creator_name column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'post_caption') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_caption TEXT;
        RAISE NOTICE 'Added post_caption column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'likes_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added likes_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'comments_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added comments_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'shares_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN shares_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added shares_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'views_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'hashtags') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
        RAISE NOTICE 'Added hashtags column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE 'Added thumbnail_url column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'posted_at') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN posted_at TIMESTAMPTZ;
        RAISE NOTICE 'Added posted_at column';
    END IF;

    -- Ensure quality_score exists with proper type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'quality_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
        RAISE NOTICE 'Added quality_score column';
    END IF;

    -- Ensure validation_count exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions' 
                   AND column_name = 'validation_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN validation_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added validation_count column';
    END IF;

    RAISE NOTICE 'All required columns are now present in trend_submissions table';
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_post_url ON public.trend_submissions(post_url);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_wave_score ON public.trend_submissions(wave_score DESC);

-- Show current table structure for verification
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'trend_submissions'
ORDER BY 
    ordinal_position;