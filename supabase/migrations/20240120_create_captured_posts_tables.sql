-- Create recording sessions table
CREATE TABLE IF NOT EXISTS recording_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  posts_captured INTEGER DEFAULT 0,
  video_url TEXT,
  status TEXT NOT NULL DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create captured posts table
CREATE TABLE IF NOT EXISTS captured_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_session_id UUID NOT NULL REFERENCES recording_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
  creator_handle TEXT NOT NULL,
  caption TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  thumbnail_url TEXT,
  song_info TEXT,
  dwell_time INTEGER DEFAULT 0, -- in seconds
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX idx_recording_sessions_status ON recording_sessions(status);
CREATE INDEX idx_captured_posts_session_id ON captured_posts(recording_session_id);
CREATE INDEX idx_captured_posts_user_id ON captured_posts(user_id);
CREATE INDEX idx_captured_posts_creator ON captured_posts(creator_handle);
CREATE INDEX idx_captured_posts_platform ON captured_posts(platform);
CREATE INDEX idx_captured_posts_captured_at ON captured_posts(captured_at DESC);

-- Create aggregated stats view
CREATE OR REPLACE VIEW post_engagement_stats AS
SELECT 
  cp.platform,
  cp.creator_handle,
  COUNT(*) as post_count,
  AVG(cp.likes_count) as avg_likes,
  AVG(cp.comments_count) as avg_comments,
  AVG(cp.shares_count) as avg_shares,
  AVG(cp.dwell_time) as avg_dwell_time,
  MAX(cp.likes_count) as max_likes,
  SUM(cp.likes_count) as total_likes
FROM captured_posts cp
GROUP BY cp.platform, cp.creator_handle;

-- Create trending creators view
CREATE OR REPLACE VIEW trending_creators AS
SELECT 
  platform,
  creator_handle,
  COUNT(DISTINCT recording_session_id) as appearance_count,
  AVG(likes_count) as avg_engagement,
  MAX(captured_at) as last_seen
FROM captured_posts
WHERE captured_at > now() - interval '7 days'
GROUP BY platform, creator_handle
HAVING COUNT(DISTINCT recording_session_id) > 2
ORDER BY avg_engagement DESC, appearance_count DESC;

-- Row Level Security policies
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_posts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recording sessions
CREATE POLICY "Users can view own recording sessions" ON recording_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recording sessions" ON recording_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recording sessions" ON recording_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can only see their own captured posts
CREATE POLICY "Users can view own captured posts" ON captured_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captured posts" ON captured_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT DO NOTHING;

-- Storage policies for recordings
CREATE POLICY "Users can upload own recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND 
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Function to update recording session stats
CREATE OR REPLACE FUNCTION update_recording_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE recording_sessions
  SET 
    posts_captured = (
      SELECT COUNT(*) 
      FROM captured_posts 
      WHERE recording_session_id = NEW.recording_session_id
    ),
    updated_at = now()
  WHERE id = NEW.recording_session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update stats when new post is captured
CREATE TRIGGER update_session_stats_on_post_insert
AFTER INSERT ON captured_posts
FOR EACH ROW
EXECUTE FUNCTION update_recording_session_stats();