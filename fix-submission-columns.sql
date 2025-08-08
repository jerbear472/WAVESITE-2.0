-- Fix missing columns in trend_submissions table
-- This script adds any missing columns that might be causing submission errors

-- Add platform column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'platform') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN platform TEXT;
        RAISE NOTICE 'Added platform column';
    END IF;
END $$;

-- Add social media metadata columns if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'creator_handle') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_handle TEXT;
        RAISE NOTICE 'Added creator_handle column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'creator_name') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_name TEXT;
        RAISE NOTICE 'Added creator_name column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'post_caption') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_caption TEXT;
        RAISE NOTICE 'Added post_caption column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'likes_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added likes_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'comments_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added comments_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'shares_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN shares_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added shares_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'views_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added views_count column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'hashtags') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
        RAISE NOTICE 'Added hashtags column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN thumbnail_url TEXT;
        RAISE NOTICE 'Added thumbnail_url column';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'screenshot_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN screenshot_url TEXT;
        RAISE NOTICE 'Added screenshot_url column';
    END IF;
END $$;

-- Show current columns in trend_submissions table
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
ORDER BY ordinal_position;
