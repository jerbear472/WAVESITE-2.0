-- Ensure trend_submissions table exists with all required columns
-- This is a safety migration to handle any missing table/column issues

-- Create trend_category enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trend_category') THEN
        CREATE TYPE trend_category AS ENUM (
            'visual_style',
            'audio_music', 
            'creator_technique',
            'meme_format',
            'product_brand',
            'behavior_pattern',
            'political',
            'finance',
            'news_events',
            'education',
            'relationship',
            'animals_pets',
            'automotive',
            'food_drink',
            'technology',
            'sports',
            'dance',
            'travel',
            'fashion',
            'gaming',
            'health',
            'diy_crafts'
        );
    END IF;
END $$;

-- Create trend_status enum if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trend_status') THEN
        CREATE TYPE trend_status AS ENUM (
            'submitted',
            'validating',
            'approved',
            'rejected',
            'viral',
            'archived'
        );
    END IF;
END $$;

-- Create trend_submissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trend_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    spotter_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Basic trend info
    post_url TEXT NOT NULL,
    platform TEXT NOT NULL,
    trend_name TEXT NOT NULL,
    description TEXT,
    category trend_category,
    
    -- Creator info
    creator_handle TEXT,
    creator_name TEXT,
    
    -- Media
    thumbnail_url TEXT,
    screenshot_url TEXT,
    
    -- Metrics
    views_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    shares_count BIGINT DEFAULT 0,
    comments_count BIGINT DEFAULT 0,
    hashtags TEXT[],
    
    -- Scoring
    virality_prediction INTEGER CHECK (virality_prediction >= 1 AND virality_prediction <= 10),
    wave_score INTEGER DEFAULT 0,
    quality_score DECIMAL(3,2) DEFAULT 0.00,
    
    -- Status
    status trend_status DEFAULT 'submitted',
    
    -- Earnings
    base_amount DECIMAL(10,2) DEFAULT 0.25,
    bonus_amount DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadata
    follow_up_data JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if they don't exist (for existing tables)
DO $$
BEGIN
    -- Add follow_up_data if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'follow_up_data') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN follow_up_data JSONB;
    END IF;
    
    -- Add base_amount if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'base_amount') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN base_amount DECIMAL(10,2) DEFAULT 0.25;
    END IF;
    
    -- Add hashtags if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'hashtags') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN hashtags TEXT[];
    END IF;
    
    -- Add wave_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'wave_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN wave_score INTEGER DEFAULT 0;
    END IF;
    
    -- Add quality_score if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' 
                   AND column_name = 'quality_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.00;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_category ON public.trend_submissions(category);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created ON public.trend_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view all trends" ON public.trend_submissions
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update own trends" ON public.trend_submissions
    FOR UPDATE USING (auth.uid() = spotter_id);