-- Additional tables for mobile app functionality

-- Recording sessions table
CREATE TABLE IF NOT EXISTS public.recording_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    posts_captured INTEGER DEFAULT 0,
    video_url TEXT,
    status TEXT DEFAULT 'recording' CHECK (status IN ('recording', 'processing', 'completed', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" ON public.recording_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.recording_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.recording_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Captured posts table
CREATE TABLE IF NOT EXISTS public.captured_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_session_id UUID REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    username TEXT,
    post_url TEXT,
    caption TEXT,
    likes INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    views INTEGER DEFAULT 0,
    audio_info JSONB,
    hashtags TEXT[],
    dwell_time_seconds DECIMAL(5,2),
    screenshot_url TEXT,
    extracted_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.captured_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own captured posts" ON public.captured_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own captured posts" ON public.captured_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_recording_sessions_user_id ON public.recording_sessions(user_id);
CREATE INDEX idx_recording_sessions_status ON public.recording_sessions(status);
CREATE INDEX idx_captured_posts_session_id ON public.captured_posts(recording_session_id);
CREATE INDEX idx_captured_posts_platform ON public.captured_posts(platform);
CREATE INDEX idx_captured_posts_captured_at ON public.captured_posts(captured_at);

-- Create storage buckets (run in dashboard after SQL)
-- INSERT INTO storage.buckets (id, name, public) 
-- VALUES 
--   ('screenshots', 'screenshots', true),
--   ('recordings', 'recordings', false),
--   ('avatars', 'avatars', true);