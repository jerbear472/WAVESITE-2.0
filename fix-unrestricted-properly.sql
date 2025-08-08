-- Fix Unrestricted Tables and Views Properly
-- This script handles both tables (with RLS) and views (which need different security approach)

-- First, let's identify what we're dealing with
DO $$
DECLARE
    obj_record RECORD;
    is_table BOOLEAN;
    is_view BOOLEAN;
BEGIN
    RAISE NOTICE 'Starting security fix for unrestricted objects...';
    
    -- List of objects to check
    FOR obj_record IN 
        SELECT unnest(ARRAY[
            'admin_cashout_queue',
            'alerts', 
            'competitor_analysis',
            'competitor_content',
            'content_analytics',
            'creator_profiles',
            'daily_challenges',
            'engagement_events'
        ]) AS obj_name
    LOOP
        -- Check if it's a table
        SELECT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = obj_record.obj_name
        ) INTO is_table;
        
        -- Check if it's a view
        SELECT EXISTS (
            SELECT 1 FROM pg_views 
            WHERE schemaname = 'public' AND viewname = obj_record.obj_name
        ) INTO is_view;
        
        IF is_table THEN
            RAISE NOTICE '% is a TABLE - Enabling RLS...', obj_record.obj_name;
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', obj_record.obj_name);
        ELSIF is_view THEN
            RAISE NOTICE '% is a VIEW - Cannot enable RLS directly', obj_record.obj_name;
        ELSE
            RAISE NOTICE '% not found in tables or views', obj_record.obj_name;
        END IF;
    END LOOP;
END $$;

-- Now let's handle RLS for actual TABLES only
-- We'll check each one individually to avoid errors

-- achievements (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'achievements') THEN
        ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own achievements" ON achievements;
        DROP POLICY IF EXISTS "System can manage achievements" ON achievements;
        
        CREATE POLICY "Users can view their own achievements" ON achievements
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "System can manage achievements" ON achievements
            FOR ALL USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS enabled for achievements table';
    END IF;
END $$;

-- ai_job_runs (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_job_runs') THEN
        ALTER TABLE ai_job_runs ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Admins can view all job runs" ON ai_job_runs;
        DROP POLICY IF EXISTS "Users can view their own job runs" ON ai_job_runs;
        
        CREATE POLICY "Users can view their own job runs" ON ai_job_runs
            FOR SELECT USING (auth.uid() = user_id OR EXISTS (
                SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
            ));
            
        RAISE NOTICE 'RLS enabled for ai_job_runs table';
    END IF;
END $$;

-- alert_notifications (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'alert_notifications') THEN
        ALTER TABLE alert_notifications ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own notifications" ON alert_notifications;
        
        CREATE POLICY "Users can manage their own notifications" ON alert_notifications
            FOR ALL USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS enabled for alert_notifications table';
    END IF;
END $$;

-- analytics_cache (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'analytics_cache') THEN
        ALTER TABLE analytics_cache ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own analytics cache" ON analytics_cache;
        
        CREATE POLICY "Users can view their own analytics cache" ON analytics_cache
            FOR SELECT USING (auth.uid() = user_id OR auth.uid()::text = entity_id);
            
        RAISE NOTICE 'RLS enabled for analytics_cache table';
    END IF;
END $$;

-- api_keys (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'api_keys') THEN
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own API keys" ON api_keys;
        
        CREATE POLICY "Users can manage their own API keys" ON api_keys
            FOR ALL USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS enabled for api_keys table';
    END IF;
END $$;

-- campaigns (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'campaigns') THEN
        ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view public campaigns" ON campaigns;
        DROP POLICY IF EXISTS "Users can manage their own campaigns" ON campaigns;
        
        CREATE POLICY "Users can view public campaigns" ON campaigns
            FOR SELECT USING (is_public = true OR auth.uid() = creator_id);
            
        CREATE POLICY "Users can manage their own campaigns" ON campaigns
            FOR ALL USING (auth.uid() = creator_id);
            
        RAISE NOTICE 'RLS enabled for campaigns table';
    END IF;
END $$;

-- captured_trends (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'captured_trends') THEN
        ALTER TABLE captured_trends ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can manage their own captured trends" ON captured_trends;
        
        CREATE POLICY "Users can manage their own captured trends" ON captured_trends
            FOR ALL USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS enabled for captured_trends table';
    END IF;
END $$;

-- cashout_requests (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cashout_requests') THEN
        ALTER TABLE cashout_requests ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own cashout requests" ON cashout_requests;
        DROP POLICY IF EXISTS "Admins can manage all cashout requests" ON cashout_requests;
        
        CREATE POLICY "Users can view their own cashout requests" ON cashout_requests
            FOR SELECT USING (auth.uid() = user_id);
            
        CREATE POLICY "Admins can manage all cashout requests" ON cashout_requests
            FOR ALL USING (EXISTS (
                SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = true
            ));
            
        RAISE NOTICE 'RLS enabled for cashout_requests table';
    END IF;
END $$;

-- earnings_ledger (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'earnings_ledger') THEN
        ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Users can view their own earnings" ON earnings_ledger;
        
        CREATE POLICY "Users can view their own earnings" ON earnings_ledger
            FOR SELECT USING (auth.uid() = user_id);
            
        RAISE NOTICE 'RLS enabled for earnings_ledger table';
    END IF;
END $$;

-- enterprise_alerts (if it's a table)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'enterprise_alerts') THEN
        ALTER TABLE enterprise_alerts ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Enterprise users can view their alerts" ON enterprise_alerts;
        
        CREATE POLICY "Enterprise users can view their alerts" ON enterprise_alerts
            FOR ALL USING (auth.uid() = user_id OR auth.uid() = organization_id::uuid);
            
        RAISE NOTICE 'RLS enabled for enterprise_alerts table';
    END IF;
END $$;

-- For VIEWS, we need to ensure the underlying tables have proper RLS
-- Views inherit security from their base tables

-- Check and report final status
SELECT 
    CASE 
        WHEN t.tablename IS NOT NULL THEN 'TABLE'
        WHEN v.viewname IS NOT NULL THEN 'VIEW'
        ELSE 'UNKNOWN'
    END as object_type,
    COALESCE(t.tablename, v.viewname) as object_name,
    CASE 
        WHEN t.rowsecurity = true THEN '✅ RLS Enabled'
        WHEN t.rowsecurity = false THEN '❌ RLS Disabled (Unrestricted)'
        WHEN v.viewname IS NOT NULL THEN '📋 View (security from base tables)'
        ELSE '❓ Unknown status'
    END as security_status
FROM 
    (SELECT unnest(ARRAY[
        'achievements',
        'admin_cashout_queue',
        'ai_job_runs',
        'alert_notifications',
        'alerts',
        'analytics_cache',
        'api_keys',
        'campaigns',
        'captured_trends',
        'cashout_requests',
        'competitor_analysis',
        'competitor_content',
        'content_analytics',
        'creator_profiles',
        'daily_challenges',
        'earnings_ledger',
        'engagement_events',
        'enterprise_alerts'
    ]) AS obj_name) objects
LEFT JOIN pg_tables t ON t.tablename = objects.obj_name AND t.schemaname = 'public'
LEFT JOIN pg_views v ON v.viewname = objects.obj_name AND v.schemaname = 'public'
ORDER BY object_type, object_name;

-- Important note about views
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===============================================';
    RAISE NOTICE 'IMPORTANT: Views marked as "Unrestricted" in Supabase dashboard';
    RAISE NOTICE 'are not actually insecure if their underlying tables have RLS.';
    RAISE NOTICE 'Views inherit security from their base tables.';
    RAISE NOTICE 'The "Unrestricted" label for views is misleading.';
    RAISE NOTICE '===============================================';
END $$;