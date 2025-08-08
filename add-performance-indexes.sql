-- Performance Optimization: Add Critical Database Indexes
-- Run this immediately to speed up your application

-- 1. Trend Submissions - Most queried table
CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_created 
ON trend_submissions(spotter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_status 
ON trend_submissions(status);

CREATE INDEX IF NOT EXISTS idx_trend_submissions_created 
ON trend_submissions(created_at DESC);

-- 2. Profiles - Frequent lookups by email and ID
CREATE INDEX IF NOT EXISTS idx_profiles_email 
ON profiles(email);

CREATE INDEX IF NOT EXISTS idx_profiles_username 
ON profiles(username);

-- 3. Trend Validations - Heavy queries for validation counts
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend 
ON trend_validations(trend_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_validator 
ON trend_validations(validator_id);

CREATE INDEX IF NOT EXISTS idx_trend_validations_composite 
ON trend_validations(trend_id, validator_id);

-- 4. Earnings Ledger - Financial queries
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_date 
ON earnings_ledger(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status 
ON earnings_ledger(status) WHERE status = 'pending';

-- 5. Captured Trends - Mobile app queries
CREATE INDEX IF NOT EXISTS idx_captured_trends_user 
ON captured_trends(user_id, created_at DESC);

-- 6. User Timeline - Frequent timeline queries
CREATE INDEX IF NOT EXISTS idx_user_timeline_user 
ON user_timeline(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_timeline_visibility 
ON user_timeline(is_public, created_at DESC);

-- 7. Cashout Requests - Financial operations
CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_status 
ON cashout_requests(user_id, status);

CREATE INDEX IF NOT EXISTS idx_cashout_requests_pending 
ON cashout_requests(status) WHERE status = 'pending';

-- 8. API Keys - Authentication lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash 
ON api_keys(key_hash) WHERE is_active = true;

-- 9. User Account Settings - Settings lookups
CREATE INDEX IF NOT EXISTS idx_user_account_settings_user 
ON user_account_settings(user_id);

-- 10. Scroll Sessions - Analytics queries
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_user_date 
ON scroll_sessions(user_id, session_date DESC);

-- Analyze tables to update statistics after index creation
ANALYZE trend_submissions;
ANALYZE profiles;
ANALYZE trend_validations;
ANALYZE earnings_ledger;
ANALYZE captured_trends;
ANALYZE user_timeline;
ANALYZE cashout_requests;

-- Check index usage stats
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as index_scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC
LIMIT 20;

-- Show tables that might need more indexes (high sequential scans)
SELECT 
    schemaname,
    tablename,
    seq_scan as sequential_scans,
    seq_tup_read as seq_tuples_read,
    idx_scan as index_scans,
    CASE 
        WHEN seq_scan > 0 THEN 
            ROUND(100.0 * idx_scan / (seq_scan + idx_scan), 2)
        ELSE 100
    END as index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 100  -- Tables with significant sequential scans
ORDER BY seq_scan DESC
LIMIT 10;

SELECT '✅ Indexes created! Your app should be noticeably faster now.' as status;