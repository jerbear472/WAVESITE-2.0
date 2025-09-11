-- Create saved_trends table for users to save trends to their timeline with reactions
CREATE TABLE IF NOT EXISTS saved_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES trend_submissions(id) ON DELETE CASCADE,
  reaction TEXT CHECK (reaction IN ('wave', 'fire', 'decline', 'death', NULL)),
  saved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  UNIQUE(user_id, trend_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_trends_user_id ON saved_trends(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_trend_id ON saved_trends(trend_id);
CREATE INDEX IF NOT EXISTS idx_saved_trends_saved_at ON saved_trends(saved_at DESC);

-- Enable RLS
ALTER TABLE saved_trends ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own saved trends" ON saved_trends
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can save trends" ON saved_trends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their saved trends" ON saved_trends
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their saved trends" ON saved_trends
  FOR DELETE USING (auth.uid() = user_id);

-- Create trend_user_votes table if not exists
CREATE TABLE IF NOT EXISTS trend_user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trend_id UUID NOT NULL REFERENCES trend_submissions(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('wave', 'fire', 'decline', 'death')),
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trend_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_user_id ON trend_user_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_trend_id ON trend_user_votes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_user_votes_voted_at ON trend_user_votes(voted_at DESC);

-- Enable RLS
ALTER TABLE trend_user_votes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own votes" ON trend_user_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can vote on trends" ON trend_user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their votes" ON trend_user_votes
  FOR UPDATE USING (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE saved_trends IS 'Stores trends saved by users to their timeline with optional reactions';
COMMENT ON TABLE trend_user_votes IS 'Tracks which trends users have voted on to prevent duplicate voting';