-- Simple fix for trend submission without trend umbrellas
-- This ensures all form fields are properly stored in the trend_submissions table

-- 1. First, remove any umbrella-related constraints and columns
DO $$ 
BEGIN
  -- Drop foreign key constraints
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS trend_submissions_trend_umbrella_id_fkey;
  ALTER TABLE trend_submissions DROP CONSTRAINT IF EXISTS fk_trend_umbrella;
  
  -- Drop the trend_umbrella_id column if it exists
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' 
             AND table_name = 'trend_submissions' 
             AND column_name = 'trend_umbrella_id') THEN
    ALTER TABLE trend_submissions DROP COLUMN trend_umbrella_id CASCADE;
  END IF;
END $$;

-- 2. Ensure trend_submissions table has all the necessary columns
DO $$ 
BEGIN
    -- Basic columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'spotter_id') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN spotter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'category') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN category TEXT NOT NULL DEFAULT 'meme_format';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'description') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN description TEXT NOT NULL DEFAULT 'No description';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'screenshot_url') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN screenshot_url TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'evidence') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN evidence JSONB DEFAULT '{}'::jsonb;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'virality_prediction') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN virality_prediction INTEGER DEFAULT 5 CHECK (virality_prediction >= 1 AND virality_prediction <= 10);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'status') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'validating', 'approved', 'rejected', 'viral'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'quality_score') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.50;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'validation_count') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN validation_count INTEGER DEFAULT 0;
    END IF;

    -- Social media metadata columns
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
        ALTER TABLE public.trend_submissions ADD COLUMN posted_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'created_at') THEN
        ALTER TABLE public.trend_submissions ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- 3. Drop any umbrella-related triggers
DROP TRIGGER IF EXISTS update_umbrella_stats_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS create_umbrella_on_submission ON trend_submissions;
DROP FUNCTION IF EXISTS update_trend_umbrella_stats() CASCADE;
DROP FUNCTION IF EXISTS auto_create_trend_umbrella() CASCADE;

-- 4. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON public.trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON public.trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON public.trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);

-- 5. Enable Row Level Security
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- 6. Drop ALL existing policies first to avoid conflicts
DO $$ 
BEGIN
    -- Get all policy names for trend_submissions and drop them
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'trend_submissions' AND schemaname = 'public')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_submissions', r.policyname);
    END LOOP;
END $$;

-- Create simple, working policies
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

-- 7. Grant permissions
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT SELECT ON public.trend_submissions TO anon;

-- 8. Create or ensure the trend-images storage bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('trend-images', 'trend-images', true)
ON CONFLICT (id) DO NOTHING;

-- 9. Storage policies for trend-images bucket
-- Drop existing policies for this bucket
DO $$ 
BEGIN
    -- Delete existing policies for trend-images bucket
    DELETE FROM storage.policies 
    WHERE bucket_id = 'trend-images';
END $$;

-- Create new policies
INSERT INTO storage.policies (bucket_id, name, operation, definition)
VALUES 
    ('trend-images', 'Authenticated users can upload', 'INSERT', '(auth.uid() IS NOT NULL)'),
    ('trend-images', 'Anyone can view images', 'SELECT', 'true')
ON CONFLICT DO NOTHING;

-- 10. Display the table structure for verification
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Success message
SELECT 'Trend submissions table is ready! All umbrella references removed.' as result;