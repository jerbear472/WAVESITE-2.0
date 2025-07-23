const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://achuavagkhjenaypawij.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

async function setupDatabase() {
  console.log('Setting up WaveSight Mobile database tables...\n');

  try {
    // For now, let's output the SQL that needs to be run
    console.log('Please run the following SQL in your Supabase dashboard:');
    console.log('1. Go to https://supabase.com/dashboard/project/achuavagkhjenaypawij/sql');
    console.log('2. Copy and paste this SQL:\n');
    
    const sql = `
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

-- RLS Policies
CREATE POLICY "Users can view own recording sessions" ON recording_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recording sessions" ON recording_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recording sessions" ON recording_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own captured posts" ON captured_posts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own captured posts" ON captured_posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT DO NOTHING;
`;

    console.log(sql);
    console.log('\n3. Click "Run" to execute the SQL\n');
    
    console.log('Alternative: You can also use the Supabase client in your app to test the connection:');
    console.log(`
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  '${supabaseUrl}',
  '${supabaseServiceKey}'
);

// Test connection
supabase.from('recording_sessions').select('*').limit(1)
  .then(({ data, error }) => {
    if (error) console.error('Error:', error);
    else console.log('Connected successfully!');
  });
`);

  } catch (error) {
    console.error('Error:', error);
  }
}

setupDatabase();