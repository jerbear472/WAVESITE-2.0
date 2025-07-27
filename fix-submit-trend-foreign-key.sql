-- Fix foreign key constraint issue for trend submissions
-- This ensures the trend_submissions table can reference the correct user table

-- First, check if we need to fix the foreign key constraint
DO $$
BEGIN
    -- Drop the existing foreign key constraint if it references user_profiles
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trend_submissions_spotter_id_fkey' 
        AND table_name = 'trend_submissions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trend_submissions 
        DROP CONSTRAINT trend_submissions_spotter_id_fkey;
    END IF;

    -- Add the correct foreign key constraint to reference profiles table
    -- Only add if it doesn't already exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'trend_submissions_spotter_id_profiles_fkey' 
        AND table_name = 'trend_submissions'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.trend_submissions 
        ADD CONSTRAINT trend_submissions_spotter_id_profiles_fkey 
        FOREIGN KEY (spotter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Ensure all required columns exist in trend_submissions table
DO $$ 
BEGIN
    -- Check if trend_submissions table exists first
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
    ELSE
        -- Add missing columns to existing table
        
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

        -- Add trend_umbrella_id if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'trend_submissions' 
                       AND column_name = 'trend_umbrella_id') THEN
            ALTER TABLE public.trend_submissions ADD COLUMN trend_umbrella_id UUID;
        END IF;

        -- Ensure quality_score exists with proper default
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_schema = 'public' 
                       AND table_name = 'trend_submissions' 
                       AND column_name = 'quality_score') THEN
            ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
        END IF;
    END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can create submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own submissions" ON public.trend_submissions;
DROP POLICY IF EXISTS "Anyone can view approved trends" ON public.trend_submissions;

-- Create comprehensive RLS policies
CREATE POLICY "Users can view own submissions"
    ON public.trend_submissions
    FOR SELECT
    USING (auth.uid() = spotter_id);

CREATE POLICY "Users can view approved trends"
    ON public.trend_submissions
    FOR SELECT
    USING (status IN ('approved', 'viral', 'validating'));

CREATE POLICY "Users can create submissions"
    ON public.trend_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update own submissions"
    ON public.trend_submissions
    FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);

-- Grant necessary permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- Success message
SELECT 'Trend submissions table is now properly configured with all required columns and foreign key constraints!' as result;