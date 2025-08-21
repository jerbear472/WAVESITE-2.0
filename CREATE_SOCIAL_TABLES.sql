-- Create trend_likes table for social engagement
CREATE TABLE IF NOT EXISTS trend_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID NOT NULL REFERENCES trend_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(50) DEFAULT 'like', -- Can be 'like', 'fire', 'dead', 'perfect' etc
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(trend_id, user_id) -- One reaction per user per trend
);

-- Create trend_comments table
CREATE TABLE IF NOT EXISTS trend_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID NOT NULL REFERENCES trend_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  parent_comment_id UUID REFERENCES trend_comments(id) ON DELETE CASCADE, -- For replies
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX idx_trend_likes_trend_id ON trend_likes(trend_id);
CREATE INDEX idx_trend_likes_user_id ON trend_likes(user_id);
CREATE INDEX idx_trend_comments_trend_id ON trend_comments(trend_id);
CREATE INDEX idx_trend_comments_user_id ON trend_comments(user_id);

-- Enable RLS
ALTER TABLE trend_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trend_likes
CREATE POLICY "Users can view all likes" ON trend_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can like trends" ON trend_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own likes" ON trend_likes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for trend_comments
CREATE POLICY "Users can view all comments" ON trend_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can post comments" ON trend_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments" ON trend_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments" ON trend_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Create a view for trend engagement metrics
CREATE OR REPLACE VIEW trend_engagement_metrics AS
SELECT 
  ts.id as trend_id,
  COUNT(DISTINCT tl.user_id) as likes_count,
  COUNT(DISTINCT tc.id) as comments_count,
  COUNT(DISTINCT tp.predictor_id) as predictions_count,
  -- Calculate heat score (engagement / age in hours)
  CASE 
    WHEN EXTRACT(EPOCH FROM (NOW() - ts.created_at)) / 3600 > 0 THEN
      (COUNT(DISTINCT tl.user_id) + 
       COUNT(DISTINCT tp.predictor_id) * 2 + 
       COUNT(DISTINCT tc.id) * 3) / 
      (EXTRACT(EPOCH FROM (NOW() - ts.created_at)) / 3600)
    ELSE 1
  END as heat_score,
  ts.created_at
FROM trend_submissions ts
LEFT JOIN trend_likes tl ON ts.id = tl.trend_id
LEFT JOIN trend_comments tc ON ts.id = tc.trend_id
LEFT JOIN trend_predictions tp ON ts.id = tp.trend_id
GROUP BY ts.id, ts.created_at;