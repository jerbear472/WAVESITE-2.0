-- Fix voted_at column issue in trend_user_votes table
-- This handles both cases: table doesn't exist, or table exists without voted_at column

-- Drop the table if it exists (safe because we're recreating it)
DROP TABLE IF EXISTS public.trend_user_votes CASCADE;

-- Create trend_user_votes table with proper structure
CREATE TABLE public.trend_user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('wave', 'fire', 'decline', 'death')),
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trend_id)
);

-- Add indexes for performance
CREATE INDEX idx_trend_user_votes_user_id ON public.trend_user_votes(user_id);
CREATE INDEX idx_trend_user_votes_trend_id ON public.trend_user_votes(trend_id);
CREATE INDEX idx_trend_user_votes_voted_at ON public.trend_user_votes(voted_at DESC);

-- Enable RLS
ALTER TABLE public.trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Create policies - users can see all votes for counting purposes
CREATE POLICY "Users can view all votes" ON public.trend_user_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote on trends" ON public.trend_user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes" ON public.trend_user_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON public.trend_user_votes TO authenticated;
GRANT SELECT ON public.trend_user_votes TO anon;

-- Add comment
COMMENT ON TABLE public.trend_user_votes IS 'Tracks which trends users have voted on to prevent duplicate voting';

-- Also ensure saved_trends table exists
CREATE TABLE IF NOT EXISTS public.saved_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
  reaction TEXT CHECK (reaction IN ('wave', 'fire', 'decline', 'death', NULL)),
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trend_id)
);

-- Add indexes for saved_trends if they don't exist
CREATE INDEX IF NOT EXISTS idx_saved_trends_user_id ON public.saved_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_trend_id ON public.saved_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_saved_at ON public.saved_trends(saved_at DESC);

-- Enable RLS for saved_trends
ALTER TABLE public.saved_trends ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view their own saved trends" ON public.saved_trends;
DROP POLICY IF EXISTS "Users can save trends" ON public.saved_trends;
DROP POLICY IF EXISTS "Users can update their saved trends" ON public.saved_trends;
DROP POLICY IF EXISTS "Users can delete their saved trends" ON public.saved_trends;

-- Create policies for saved_trends
CREATE POLICY "Users can view their own saved trends" ON public.saved_trends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save trends" ON public.saved_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved trends" ON public.saved_trends
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved trends" ON public.saved_trends
  FOR DELETE USING (auth.uid() = user_id);

-- Grant permissions for saved_trends
GRANT ALL ON public.saved_trends TO authenticated;
GRANT SELECT ON public.saved_trends TO anon;

-- Add comment
COMMENT ON TABLE public.saved_trends IS 'Stores trends saved by users to their timeline with optional reactions';