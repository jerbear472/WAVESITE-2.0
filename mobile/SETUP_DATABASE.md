# Database Setup for Screen Recording

If you're getting "Failed to start recording" errors, the database tables might not be created yet.

## Quick Setup

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run this SQL to create the required tables:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create recording_sessions table
CREATE TABLE IF NOT EXISTS public.recording_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL CHECK (platform IN ('tiktok', 'instagram')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    posts_captured INTEGER DEFAULT 0,
    video_url TEXT,
    status TEXT DEFAULT 'recording' CHECK (status IN ('preparing', 'recording', 'processing', 'completed', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.recording_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own sessions" ON public.recording_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" ON public.recording_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON public.recording_sessions
    FOR UPDATE USING (auth.uid() = user_id);

-- Create captured_posts table  
CREATE TABLE IF NOT EXISTS public.captured_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recording_session_id UUID REFERENCES public.recording_sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    creator_handle TEXT,
    post_url TEXT,
    caption TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    views_count INTEGER DEFAULT 0,
    song_info TEXT,
    hashtags TEXT[],
    dwell_time DECIMAL(5,2),
    screenshot_url TEXT,
    extracted_data JSONB,
    captured_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.captured_posts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own captured posts" ON public.captured_posts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own captured posts" ON public.captured_posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_recording_sessions_user_id ON public.recording_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_recording_sessions_status ON public.recording_sessions(status);
CREATE INDEX IF NOT EXISTS idx_captured_posts_session_id ON public.captured_posts(recording_session_id);
```

## The App Works Without Database

The app has been updated to work even without the database tables. It will:
- Continue to function for screen recording
- Open TikTok/Instagram as expected
- Show appropriate messages if database is not connected

## How Screen Recording Works

1. **iOS Security**: Apps cannot programmatically start screen recording due to iOS security
2. **Manual Process**: Users must start screen recording from Control Center
3. **App Switching**: The app will automatically open TikTok/Instagram after a countdown
4. **Recording**: iOS will record everything on screen
5. **Saving**: Users save the video from the iOS preview after stopping recording

## Testing Deep Links

To verify TikTok/Instagram opening works:

1. Make sure TikTok/Instagram apps are installed
2. The app will try the native app first (`tiktok://` or `instagram://`)
3. If not installed, it opens the web version
4. Check console logs in Xcode for debugging info