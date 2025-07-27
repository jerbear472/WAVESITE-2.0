-- Quick fix for trend_umbrella_id column error

-- First, create the trend_umbrellas table if it doesn't exist
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

-- Add the trend_umbrella_id column to trend_submissions
ALTER TABLE public.trend_submissions 
ADD COLUMN IF NOT EXISTS trend_umbrella_id UUID REFERENCES public.trend_umbrellas(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_umbrella 
ON public.trend_submissions(trend_umbrella_id);

-- Enable RLS for trend_umbrellas
ALTER TABLE public.trend_umbrellas ENABLE ROW LEVEL SECURITY;

-- Create policies for trend_umbrellas
CREATE POLICY "Anyone can view trend umbrellas" ON public.trend_umbrellas
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create trend umbrellas" ON public.trend_umbrellas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update trend umbrellas" ON public.trend_umbrellas
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT ALL ON public.trend_umbrellas TO authenticated;
GRANT ALL ON public.trend_umbrellas TO anon;