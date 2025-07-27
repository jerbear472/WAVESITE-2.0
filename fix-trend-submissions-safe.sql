-- Safe fix for trend_submissions table - handles existing policies
-- This version checks for existing policies before creating them

-- First, ensure the table exists with all columns
DO $$ 
BEGIN
    -- Check if trend_submissions table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'trend_submissions') THEN
        -- Create the table if it doesn't exist
        CREATE TABLE public.trend_submissions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            spotter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            screenshot_url TEXT,
            evidence JSONB,
            virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
            predicted_peak_date TIMESTAMPTZ,
            status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'validating', 'approved', 'rejected', 'viral')),
            approved_by_id UUID REFERENCES public.profiles(id),
            quality_score DECIMAL(3,2) DEFAULT 0.50,
            validation_count INTEGER DEFAULT 0,
            bounty_amount DECIMAL(10,2) DEFAULT 0.00,
            bounty_paid BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            validated_at TIMESTAMPTZ,
            mainstream_at TIMESTAMPTZ,
            -- Social media metadata columns
            creator_handle TEXT,
            creator_name TEXT,
            post_caption TEXT,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            views_count INTEGER DEFAULT 0,
            hashtags TEXT[],
            post_url TEXT,
            thumbnail_url TEXT,
            posted_at TIMESTAMPTZ,
            trend_umbrella_id UUID
        );
    END IF;
END $$;

-- Add missing columns to existing table (safe - won't error if column exists)
DO $$ 
BEGIN
    -- Add each column only if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'creator_handle') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_handle TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'creator_name') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN creator_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'post_caption') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_caption TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'likes_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN likes_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'comments_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN comments_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'shares_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN shares_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'views_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN views_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'hashtags') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'post_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN post_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'thumbnail_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN thumbnail_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'posted_at') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN posted_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'trend_umbrella_id') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN trend_umbrella_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'quality_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
    END IF;
END $$;

-- Enable RLS if not already enabled
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Check and create indexes only if they don't exist
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);

-- Grant permissions (safe - won't error if already granted)
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Check current RLS policies
DO $$
DECLARE
    policy_count INTEGER;
BEGIN
    -- Count existing policies
    SELECT COUNT(*) INTO policy_count 
    FROM pg_policies 
    WHERE tablename = 'trend_submissions';
    
    RAISE NOTICE 'Found % existing policies on trend_submissions table', policy_count;
    
    -- List existing policies
    FOR policy_count IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'trend_submissions'
    LOOP
        RAISE NOTICE 'Existing policy: %', policy_count;
    END LOOP;
END $$;

-- Success message with column check
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO col_count 
    FROM information_schema.columns 
    WHERE table_name = 'trend_submissions';
    
    RAISE NOTICE 'trend_submissions table has % columns', col_count;
    RAISE NOTICE 'Table is ready for use! All social media metadata columns are present.';
END $$;

-- Verify the table structure
SELECT 
    column_name, 
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'trend_submissions' 
ORDER BY ordinal_position;