-- Create captured_trends table
CREATE TABLE IF NOT EXISTS captured_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  platform TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  hashtags TEXT,
  metadata JSONB DEFAULT '{}',
  captured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_trending BOOLEAN DEFAULT FALSE,
  engagement_score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_captured_trends_user_id ON captured_trends(user_id);
CREATE INDEX idx_captured_trends_platform ON captured_trends(platform);
CREATE INDEX idx_captured_trends_captured_at ON captured_trends(captured_at DESC);
CREATE INDEX idx_captured_trends_is_trending ON captured_trends(is_trending);

-- Create unique constraint to prevent duplicate captures
CREATE UNIQUE INDEX idx_captured_trends_user_url ON captured_trends(user_id, url);

-- Enable Row Level Security
ALTER TABLE captured_trends ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own captured trends"
  ON captured_trends FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own captured trends"
  ON captured_trends FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own captured trends"
  ON captured_trends FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own captured trends"
  ON captured_trends FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_captured_trends_updated_at
  BEFORE UPDATE ON captured_trends
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();