-- ============================================
-- FINAL DATABASE FIXES
-- Run this to ensure everything is ready
-- ============================================

-- 1. Add missing trend_umbrella_id column
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_umbrella_id UUID DEFAULT NULL;

-- 2. Add index for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_umbrella_id 
ON trend_submissions(trend_umbrella_id);

-- 3. Ensure all required columns exist in user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS birthday DATE,
ADD COLUMN IF NOT EXISTS age_verified BOOLEAN DEFAULT false;

-- 4. Ensure earnings_ledger has all columns
ALTER TABLE earnings_ledger
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

-- 5. Verify everything is set up
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as row_count,
    COUNT(DISTINCT id) as unique_users
FROM user_profiles
UNION ALL
SELECT 
    'trend_submissions',
    COUNT(*),
    COUNT(DISTINCT spotter_id)
FROM trend_submissions
UNION ALL
SELECT 
    'trend_validations',
    COUNT(*),
    COUNT(DISTINCT validator_id)
FROM trend_validations;

-- Success message
SELECT '✅ All database fixes applied!' as status;