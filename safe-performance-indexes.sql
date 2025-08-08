-- Safe Performance Indexes - Checks columns exist before creating indexes
-- This script won't error if columns don't exist

-- First, let's see what columns actually exist in key tables
SELECT 
    '📊 Checking table structures...' as status;

SELECT 
    table_name,
    string_agg(column_name, ', ' ORDER BY ordinal_position) as columns
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'trend_submissions',
        'trend_validations', 
        'profiles',
        'earnings_ledger',
        'captured_trends',
        'user_timeline',
        'cashout_requests'
    )
GROUP BY table_name
ORDER BY table_name;

-- Now create indexes only for columns that exist
DO $$
BEGIN
    -- 1. Trend Submissions Indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'trend_submissions' 
               AND column_name = 'spotter_id') THEN
        CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_created 
        ON trend_submissions(spotter_id, created_at DESC);
        RAISE NOTICE 'Created index on trend_submissions(spotter_id, created_at)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'trend_submissions' 
               AND column_name = 'status') THEN
        CREATE INDEX IF NOT EXISTS idx_trend_submissions_status 
        ON trend_submissions(status);
        RAISE NOTICE 'Created index on trend_submissions(status)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'trend_submissions' 
               AND column_name = 'created_at') THEN
        CREATE INDEX IF NOT EXISTS idx_trend_submissions_created 
        ON trend_submissions(created_at DESC);
        RAISE NOTICE 'Created index on trend_submissions(created_at)';
    END IF;

    -- 2. Profiles Indexes
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'profiles' 
               AND column_name = 'email') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_email 
        ON profiles(email);
        RAISE NOTICE 'Created index on profiles(email)';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_schema = 'public' AND table_name = 'profiles' 
               AND column_name = 'username') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_username 
        ON profiles(username);
        RAISE NOTICE 'Created index on profiles(username)';
    END IF;

    -- 3. Trend Validations - Check actual column names
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'trend_validations') THEN
        
        -- Check for submission_id (might be used instead of trend_id)
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'trend_validations' 
                   AND column_name = 'submission_id') THEN
            CREATE INDEX IF NOT EXISTS idx_trend_validations_submission 
            ON trend_validations(submission_id);
            RAISE NOTICE 'Created index on trend_validations(submission_id)';
        END IF;

        -- Check for trend_submission_id
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'trend_validations' 
                   AND column_name = 'trend_submission_id') THEN
            CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_submission 
            ON trend_validations(trend_submission_id);
            RAISE NOTICE 'Created index on trend_validations(trend_submission_id)';
        END IF;

        -- Check for validator_id
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'trend_validations' 
                   AND column_name = 'validator_id') THEN
            CREATE INDEX IF NOT EXISTS idx_trend_validations_validator 
            ON trend_validations(validator_id);
            RAISE NOTICE 'Created index on trend_validations(validator_id)';
        END IF;
    END IF;

    -- 4. Earnings Ledger Indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'earnings_ledger') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'earnings_ledger' 
                   AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_date 
            ON earnings_ledger(user_id, created_at DESC);
            RAISE NOTICE 'Created index on earnings_ledger(user_id, created_at)';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'earnings_ledger' 
                   AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_earnings_ledger_pending 
            ON earnings_ledger(status) WHERE status = 'pending';
            RAISE NOTICE 'Created partial index on earnings_ledger(status) for pending';
        END IF;
    END IF;

    -- 5. Captured Trends Indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'captured_trends') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'captured_trends' 
                   AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_captured_trends_user 
            ON captured_trends(user_id, created_at DESC);
            RAISE NOTICE 'Created index on captured_trends(user_id, created_at)';
        END IF;
    END IF;

    -- 6. User Timeline Indexes  
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'user_timeline') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'user_timeline' 
                   AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_user_timeline_user 
            ON user_timeline(user_id, created_at DESC);
            RAISE NOTICE 'Created index on user_timeline(user_id, created_at)';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'user_timeline' 
                   AND column_name = 'is_public') THEN
            CREATE INDEX IF NOT EXISTS idx_user_timeline_visibility 
            ON user_timeline(is_public, created_at DESC);
            RAISE NOTICE 'Created index on user_timeline(is_public, created_at)';
        END IF;
    END IF;

    -- 7. Cashout Requests Indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'cashout_requests') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'cashout_requests' 
                   AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_cashout_requests_user_status 
            ON cashout_requests(user_id, status);
            RAISE NOTICE 'Created index on cashout_requests(user_id, status)';
        END IF;
    END IF;

END $$;

-- Update table statistics for query planner
ANALYZE trend_submissions;
ANALYZE profiles;
ANALYZE trend_validations;
ANALYZE earnings_ledger;

-- Show what indexes were created
SELECT 
    '✅ Index Creation Complete' as status;

SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
    AND tablename IN (
        'trend_submissions',
        'trend_validations',
        'profiles',
        'earnings_ledger',
        'captured_trends',
        'user_timeline',
        'cashout_requests'
    )
ORDER BY tablename, indexname;

-- Performance check: Show tables with high sequential scans that might need more indexes
SELECT 
    '⚠️ Tables that might need additional indexes:' as info;

SELECT 
    tablename,
    seq_scan as "Sequential Scans",
    idx_scan as "Index Scans",
    CASE 
        WHEN seq_scan > 0 THEN 
            ROUND(100.0 * idx_scan / NULLIF(seq_scan + idx_scan, 0), 2)
        ELSE 100
    END as "Index Usage %"
FROM pg_stat_user_tables
WHERE schemaname = 'public'
    AND seq_scan > 100
ORDER BY seq_scan DESC
LIMIT 5;

SELECT 
    '🚀 Performance indexes have been safely created!' as final_status,
    'Your queries should be faster now.' as message;