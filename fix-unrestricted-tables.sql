-- Fix Unrestricted Tables by Enabling Row Level Security (RLS)
-- This script enables RLS and sets up appropriate policies for all unrestricted tables

-- Enable RLS on all unrestricted tables
ALTER TABLE admin_cashout_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE competitor_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;

-- Admin Cashout Queue - Only admins and the user can see their own requests
CREATE POLICY "Users can view their own cashout requests" ON admin_cashout_queue
  FOR SELECT USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can insert cashout requests" ON admin_cashout_queue
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can update cashout requests" ON admin_cashout_queue
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Alerts - Users can only see their own alerts
CREATE POLICY "Users can view their own alerts" ON alerts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create alerts" ON alerts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" ON alerts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own alerts" ON alerts
  FOR DELETE USING (auth.uid() = user_id);

-- Competitor Analysis - Read-only for authenticated users, write for admins
CREATE POLICY "Authenticated users can view competitor analysis" ON competitor_analysis
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can insert competitor analysis" ON competitor_analysis
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can update competitor analysis" ON competitor_analysis
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can delete competitor analysis" ON competitor_analysis
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Competitor Content - Similar to competitor analysis
CREATE POLICY "Authenticated users can view competitor content" ON competitor_content
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can manage competitor content" ON competitor_content
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Content Analytics - Users can see their own analytics
CREATE POLICY "Users can view their own content analytics" ON content_analytics
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "System can insert content analytics" ON content_analytics
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = creator_id);

CREATE POLICY "Users can update their own content analytics" ON content_analytics
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = creator_id);

-- Creator Profiles - Public read, users can manage their own
CREATE POLICY "Anyone can view creator profiles" ON creator_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can create their own creator profile" ON creator_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own creator profile" ON creator_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own creator profile" ON creator_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Daily Challenges - Authenticated users can view, admins can manage
CREATE POLICY "Authenticated users can view daily challenges" ON daily_challenges
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can create daily challenges" ON daily_challenges
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can update daily challenges" ON daily_challenges
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

CREATE POLICY "Only admins can delete daily challenges" ON daily_challenges
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
  ));

-- Engagement Events - Users can see and manage their own events
CREATE POLICY "Users can view their own engagement events" ON engagement_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own engagement events" ON engagement_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own engagement events" ON engagement_events
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own engagement events" ON engagement_events
  FOR DELETE USING (auth.uid() = user_id);

-- Additional safety: Ensure profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- If profiles policies don't exist, create them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Public profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON profiles
      FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile" ON profiles
      FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON profiles
      FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;

-- Verify RLS is enabled on all tables
SELECT 
  schemaname,
  tablename,
  CASE 
    WHEN rowsecurity = true THEN 'RLS Enabled ✓'
    ELSE 'RLS DISABLED ✗'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'admin_cashout_queue',
    'alerts',
    'competitor_analysis',
    'competitor_content',
    'content_analytics',
    'creator_profiles',
    'daily_challenges',
    'engagement_events'
  )
ORDER BY tablename;