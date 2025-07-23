# WaveSight Mobile Database Setup

Since there's a connection issue with the Supabase CLI, please set up the database manually:

## Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql

2. Copy and paste the following SQL into the SQL Editor:

```sql
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
  dwell_time INTEGER DEFAULT 0,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  raw_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_id ON recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON recording_sessions(status);
CREATE INDEX IF NOT EXISTS idx_captured_posts_session_id ON captured_posts(recording_session_id);
CREATE INDEX IF NOT EXISTS idx_captured_posts_user_id ON captured_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_captured_posts_creator ON captured_posts(creator_handle);
CREATE INDEX IF NOT EXISTS idx_captured_posts_platform ON captured_posts(platform);
CREATE INDEX IF NOT EXISTS idx_captured_posts_captured_at ON captured_posts(captured_at DESC);

-- Enable RLS
ALTER TABLE recording_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE captured_posts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recording_sessions
CREATE POLICY "Users can view own recording sessions" ON recording_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recording sessions" ON recording_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recording sessions" ON recording_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for captured_posts
CREATE POLICY "Users can view own captured posts" ON captured_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captured posts" ON captured_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket for recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT DO NOTHING;

-- Storage policies
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

-- Trigger to update stats
CREATE TRIGGER update_session_stats_on_post_insert
AFTER INSERT ON captured_posts
FOR EACH ROW
EXECUTE FUNCTION update_recording_session_stats();
```

3. Click **Run** to execute the SQL

## Option 2: Using psql (if you have direct access)

```bash
psql "postgresql://postgres:qIvwos-vujzy1-dopzeb@db.achuavagkhjenaypawij.supabase.co:5432/postgres" -f /path/to/migration.sql
```

## Verify Setup

After running the SQL, verify the tables were created:

1. Go to Table Editor in Supabase Dashboard
2. You should see:
   - `recording_sessions` table
   - `captured_posts` table

3. Check Storage buckets:
   - You should see a `recordings` bucket

## Test the Connection

In your React Native app, test the connection:

```javascript
import { supabase } from './src/config/supabase';

// Test query
const testConnection = async () => {
  const { data, error } = await supabase
    .from('recording_sessions')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('Connection error:', error);
  } else {
    console.log('Connected successfully!');
  }
};
```

## Next Steps

Once the database is set up:

1. Run the mobile app
2. Create a test account
3. Start a recording session
4. The app will automatically create entries in the database

## Troubleshooting

If you still have connection issues:

1. Check if your Supabase project is paused (free tier pauses after inactivity)
2. Verify the project URL is correct
3. Try using the connection pooler URL instead
4. Check your network/firewall settings