-- Simple Performance Indexes - No fancy checks, just create what we can

-- 1. Trend Submissions (main table for trends)
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created ON trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON trend_submissions(status);

-- 2. Profiles (user data)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- 3. Earnings Ledger (if exists)
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user ON earnings_ledger(user_id);

-- 4. Captured Trends (mobile app data)
CREATE INDEX IF NOT EXISTS idx_captured_trends_user ON captured_trends(user_id);

-- That's it. Simple indexes created.
SELECT 'Indexes created successfully' as status;