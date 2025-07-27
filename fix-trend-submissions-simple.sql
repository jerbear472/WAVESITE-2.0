-- Simple fix for trend_submissions table without complex loops

-- First, ensure the table has all required columns
DO $$ 
BEGIN
    -- Add missing columns one by one (safe - won't error if exists)
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_handle TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_name TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN post_caption TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN shares_count INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN post_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN thumbnail_url TEXT;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN posted_at TIMESTAMPTZ;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN trend_umbrella_id UUID;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
    
    BEGIN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
    EXCEPTION WHEN duplicate_column THEN NULL;
    END;
END $$;

-- Enable RLS
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);

-- Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Show current table structure
SELECT 
    column_name, 
    data_type,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
AND column_name IN (
    'creator_handle', 'creator_name', 'post_caption', 
    'likes_count', 'comments_count', 'views_count',
    'hashtags', 'thumbnail_url', 'posted_at'
)
ORDER BY ordinal_position;

-- Show existing policies
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE tablename = 'trend_submissions';

-- Final message
SELECT 'Table updated successfully! All social media columns are now available.' as status;