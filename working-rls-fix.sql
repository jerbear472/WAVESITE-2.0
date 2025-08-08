-- Simple, working RLS fix
-- This script enables RLS on tables only (not views) and adds basic security

-- Enable RLS on tables that exist (ignore views)
DO $$
DECLARE
    rec RECORD;
BEGIN
    -- Process each potential table
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN (
            'achievements',
            'ai_job_runs',
            'alert_notifications',
            'analytics_cache',
            'api_keys',
            'campaigns',
            'captured_trends',
            'cashout_requests',
            'earnings_ledger',
            'enterprise_alerts'
        )
    LOOP
        BEGIN
            -- Enable RLS
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.tablename);
            RAISE NOTICE 'Enabled RLS on table: %', rec.tablename;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE 'Could not enable RLS on %: %', rec.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Now add basic policies for each table based on common patterns
-- These are simple, safe policies that won't error on missing columns

-- achievements table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "achievements_select_policy" ON achievements;
        DROP POLICY IF EXISTS "achievements_all_policy" ON achievements;
        
        -- Check which column exists and create appropriate policy
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'user_id') THEN
            CREATE POLICY "achievements_select_policy" ON achievements 
                FOR SELECT USING (auth.uid() = user_id);
            CREATE POLICY "achievements_all_policy" ON achievements 
                FOR ALL USING (auth.uid() = user_id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_schema = 'public' AND table_name = 'achievements' AND column_name = 'profile_id') THEN
            CREATE POLICY "achievements_select_policy" ON achievements 
                FOR SELECT USING (auth.uid() = profile_id);
            CREATE POLICY "achievements_all_policy" ON achievements 
                FOR ALL USING (auth.uid() = profile_id);
        ELSE
            -- No user reference, make it authenticated users only
            CREATE POLICY "achievements_select_policy" ON achievements 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to achievements';
    END IF;
END $$;

-- ai_job_runs table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_job_runs') THEN
        DROP POLICY IF EXISTS "ai_job_runs_policy" ON ai_job_runs;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'ai_job_runs' AND column_name = 'user_id') THEN
            CREATE POLICY "ai_job_runs_policy" ON ai_job_runs 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            CREATE POLICY "ai_job_runs_policy" ON ai_job_runs 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to ai_job_runs';
    END IF;
END $$;

-- alert_notifications table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_notifications') THEN
        DROP POLICY IF EXISTS "alert_notifications_policy" ON alert_notifications;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'alert_notifications' AND column_name = 'user_id') THEN
            CREATE POLICY "alert_notifications_policy" ON alert_notifications 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            CREATE POLICY "alert_notifications_policy" ON alert_notifications 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to alert_notifications';
    END IF;
END $$;

-- analytics_cache table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_cache') THEN
        DROP POLICY IF EXISTS "analytics_cache_policy" ON analytics_cache;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'analytics_cache' AND column_name = 'user_id') THEN
            CREATE POLICY "analytics_cache_policy" ON analytics_cache 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            CREATE POLICY "analytics_cache_policy" ON analytics_cache 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to analytics_cache';
    END IF;
END $$;

-- api_keys table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys') THEN
        DROP POLICY IF EXISTS "api_keys_policy" ON api_keys;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'api_keys' AND column_name = 'user_id') THEN
            CREATE POLICY "api_keys_policy" ON api_keys 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            -- API keys should be restricted
            CREATE POLICY "api_keys_policy" ON api_keys 
                FOR ALL USING (false);
        END IF;
        RAISE NOTICE 'Added policies to api_keys';
    END IF;
END $$;

-- campaigns table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaigns') THEN
        DROP POLICY IF EXISTS "campaigns_select_policy" ON campaigns;
        DROP POLICY IF EXISTS "campaigns_modify_policy" ON campaigns;
        
        -- Campaigns might be public read
        CREATE POLICY "campaigns_select_policy" ON campaigns 
            FOR SELECT USING (true);
            
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'creator_id') THEN
            CREATE POLICY "campaigns_modify_policy" ON campaigns 
                FOR ALL USING (auth.uid() = creator_id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'campaigns' AND column_name = 'user_id') THEN
            CREATE POLICY "campaigns_modify_policy" ON campaigns 
                FOR ALL USING (auth.uid() = user_id);
        END IF;
        RAISE NOTICE 'Added policies to campaigns';
    END IF;
END $$;

-- captured_trends table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'captured_trends') THEN
        DROP POLICY IF EXISTS "captured_trends_policy" ON captured_trends;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'captured_trends' AND column_name = 'user_id') THEN
            CREATE POLICY "captured_trends_policy" ON captured_trends 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            CREATE POLICY "captured_trends_policy" ON captured_trends 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to captured_trends';
    END IF;
END $$;

-- cashout_requests table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cashout_requests') THEN
        DROP POLICY IF EXISTS "cashout_requests_policy" ON cashout_requests;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'cashout_requests' AND column_name = 'user_id') THEN
            CREATE POLICY "cashout_requests_policy" ON cashout_requests 
                FOR ALL USING (auth.uid() = user_id);
        ELSE
            -- Cashout requests should be restricted
            CREATE POLICY "cashout_requests_policy" ON cashout_requests 
                FOR ALL USING (false);
        END IF;
        RAISE NOTICE 'Added policies to cashout_requests';
    END IF;
END $$;

-- earnings_ledger table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'earnings_ledger') THEN
        DROP POLICY IF EXISTS "earnings_ledger_policy" ON earnings_ledger;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'earnings_ledger' AND column_name = 'user_id') THEN
            CREATE POLICY "earnings_ledger_policy" ON earnings_ledger 
                FOR SELECT USING (auth.uid() = user_id);
        ELSE
            -- Earnings should be restricted
            CREATE POLICY "earnings_ledger_policy" ON earnings_ledger 
                FOR ALL USING (false);
        END IF;
        RAISE NOTICE 'Added policies to earnings_ledger';
    END IF;
END $$;

-- enterprise_alerts table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enterprise_alerts') THEN
        DROP POLICY IF EXISTS "enterprise_alerts_policy" ON enterprise_alerts;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'enterprise_alerts' AND column_name = 'user_id') THEN
            CREATE POLICY "enterprise_alerts_policy" ON enterprise_alerts 
                FOR ALL USING (auth.uid() = user_id);
        ELSIF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' AND table_name = 'enterprise_alerts' AND column_name = 'organization_id') THEN
            CREATE POLICY "enterprise_alerts_policy" ON enterprise_alerts 
                FOR ALL USING (auth.uid()::text = organization_id::text);
        ELSE
            CREATE POLICY "enterprise_alerts_policy" ON enterprise_alerts 
                FOR SELECT USING (auth.role() = 'authenticated');
        END IF;
        RAISE NOTICE 'Added policies to enterprise_alerts';
    END IF;
END $$;

-- Final status check
SELECT 
    tablename as "Table",
    CASE 
        WHEN rowsecurity = true THEN '✅ Secured'
        ELSE '❌ Not Secured'
    END as "Status",
    (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = 'public') as "Policies"
FROM pg_tables t
WHERE schemaname = 'public'
AND tablename IN (
    'achievements',
    'ai_job_runs',
    'alert_notifications',
    'analytics_cache',
    'api_keys',
    'campaigns',
    'captured_trends',
    'cashout_requests',
    'earnings_ledger',
    'enterprise_alerts'
)
ORDER BY tablename;

-- Note about views
SELECT 
    '📋 Note: These are VIEWS (not tables):' as info,
    string_agg(viewname, ', ') as view_names
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN (
    'admin_cashout_queue',
    'alerts',
    'competitor_analysis',
    'competitor_content',
    'content_analytics',
    'creator_profiles',
    'daily_challenges',
    'engagement_events'
)
HAVING COUNT(*) > 0;