-- Apply all necessary database updates for trend submission functionality

-- First, ensure trend_submissions table has all required columns
DO $$ 
BEGIN
    -- Add social media metadata columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'creator_handle') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN creator_handle TEXT,
        ADD COLUMN creator_name TEXT,
        ADD COLUMN post_caption TEXT,
        ADD COLUMN likes_count INTEGER DEFAULT 0,
        ADD COLUMN comments_count INTEGER DEFAULT 0,
        ADD COLUMN shares_count INTEGER DEFAULT 0,
        ADD COLUMN views_count INTEGER DEFAULT 0,
        ADD COLUMN hashtags TEXT[],
        ADD COLUMN post_url TEXT,
        ADD COLUMN thumbnail_url TEXT,
        ADD COLUMN posted_at TIMESTAMPTZ;
        
        -- Add indexes
        CREATE INDEX idx_trend_submissions_creator_handle ON public.trend_submissions(creator_handle);
        CREATE INDEX idx_trend_submissions_hashtags ON public.trend_submissions USING GIN(hashtags);
    END IF;
END $$;

-- Create trend_umbrellas table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.trend_umbrellas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  submission_count INTEGER DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  avg_virality_score DECIMAL(3,2) DEFAULT 0,
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  peak_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'emerging',
  common_hashtags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trend_umbrella_id to trend_submissions if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'trend_submissions' AND column_name = 'trend_umbrella_id') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN trend_umbrella_id UUID REFERENCES public.trend_umbrellas(id);
        
        -- Create index
        CREATE INDEX idx_trend_submissions_umbrella ON public.trend_submissions(trend_umbrella_id);
    END IF;
END $$;

-- Enable RLS for trend_umbrellas
ALTER TABLE public.trend_umbrellas ENABLE ROW LEVEL SECURITY;

-- Create policies for trend_umbrellas
CREATE POLICY "Anyone can view trend umbrellas" ON public.trend_umbrellas
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create trend umbrellas" ON public.trend_umbrellas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update trend umbrellas" ON public.trend_umbrellas
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Create or update the function to update umbrella statistics
CREATE OR REPLACE FUNCTION public.update_trend_umbrella_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trend_umbrella_id IS NOT NULL THEN
    UPDATE public.trend_umbrellas
    SET 
      submission_count = (
        SELECT COUNT(*) 
        FROM public.trend_submissions 
        WHERE trend_umbrella_id = NEW.trend_umbrella_id
      ),
      total_engagement = (
        SELECT SUM(COALESCE(likes_count, 0) + COALESCE(comments_count, 0) + 
                   COALESCE(shares_count, 0) + COALESCE(views_count, 0))
        FROM public.trend_submissions 
        WHERE trend_umbrella_id = NEW.trend_umbrella_id
      ),
      last_updated_at = NOW()
    WHERE id = NEW.trend_umbrella_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_umbrella_stats_trigger ON public.trend_submissions;
CREATE TRIGGER update_umbrella_stats_trigger
AFTER INSERT OR UPDATE ON public.trend_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_trend_umbrella_stats();

-- Ensure RLS policies are correct for trend_submissions
DROP POLICY IF EXISTS "Authenticated users can submit trends" ON public.trend_submissions;
CREATE POLICY "Authenticated users can submit trends" ON public.trend_submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.trend_submissions TO authenticated;
GRANT ALL ON public.trend_umbrellas TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_trend_umbrella_stats() TO authenticated;

-- Create storage bucket for trend images if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES (
  'trend-images', 
  'trend-images', 
  true, 
  false, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Give users access to upload trend images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'trend-images' AND auth.role() = 'authenticated');

CREATE POLICY "Give public access to view trend images" ON storage.objects
FOR SELECT USING (bucket_id = 'trend-images');

CREATE POLICY "Give users access to update their own trend images" ON storage.objects
FOR UPDATE USING (bucket_id = 'trend-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Give users access to delete their own trend images" ON storage.objects
FOR DELETE USING (bucket_id = 'trend-images' AND auth.uid()::text = (storage.foldername(name))[1]);