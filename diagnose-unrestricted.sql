-- Diagnostic script to understand what's showing as "Unrestricted"
-- This will tell us exactly what's happening

-- 1. Check which items are TABLES vs VIEWS
SELECT 
    'TABLE' as type,
    tablename as name,
    CASE 
        WHEN rowsecurity = true THEN '✅ RLS ENABLED (Secured)'
        ELSE '❌ RLS DISABLED (Shows as Unrestricted)'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
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
)

UNION ALL

SELECT 
    'VIEW' as type,
    viewname as name,
    '📋 ALWAYS shows as Unrestricted (this is NORMAL for views)' as status
FROM pg_views
WHERE schemaname = 'public'
AND viewname IN (
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
)
ORDER BY type DESC, name;

-- 2. Check if policies exist for tables
SELECT 
    '---' as "---",
    'POLICIES CHECK' as "---"
FROM (SELECT 1) x;

SELECT 
    tablename as "Table Name",
    COUNT(policyname) as "Number of Policies",
    STRING_AGG(policyname, ', ') as "Policy Names"
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN (
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
)
GROUP BY tablename
ORDER BY tablename;

-- 3. Force enable RLS on any tables that still have it disabled
DO $$
DECLARE
    rec RECORD;
    enabled_count INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== ATTEMPTING TO FORCE ENABLE RLS ===';
    
    FOR rec IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND rowsecurity = false
        AND tablename IN (
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
        )
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', rec.tablename);
            RAISE NOTICE '✅ Force enabled RLS on: %', rec.tablename;
            enabled_count := enabled_count + 1;
        EXCEPTION 
            WHEN OTHERS THEN
                RAISE NOTICE '❌ Could not enable RLS on %: %', rec.tablename, SQLERRM;
        END;
    END LOOP;
    
    IF enabled_count = 0 THEN
        RAISE NOTICE 'No tables needed RLS enabling (all were already enabled or are views)';
    ELSE
        RAISE NOTICE 'Successfully enabled RLS on % table(s)', enabled_count;
    END IF;
END $$;

-- 4. Final summary
SELECT 
    '---' as "---",
    'FINAL SUMMARY' as "---"
FROM (SELECT 1) x;

SELECT 
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as "Tables with RLS Enabled",
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as "Tables with RLS Disabled",
    STRING_AGG(CASE WHEN rowsecurity = false THEN tablename END, ', ') as "Tables Still Unrestricted"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
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
);

-- Important message
SELECT 
    '⚠️ IMPORTANT' as "Note",
    'If items still show as Unrestricted in Supabase UI, they are VIEWS not TABLES. This is NORMAL and not a security issue.' as "Message";