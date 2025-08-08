-- Inspect actual table structures to understand what columns exist
-- This will help us create proper RLS policies with correct column references

-- Get all columns for potentially unrestricted tables
SELECT 
    t.table_name,
    t.table_type,
    string_agg(
        c.column_name || ' (' || c.data_type || ')', 
        ', ' 
        ORDER BY c.ordinal_position
    ) as columns,
    CASE 
        WHEN c2.user_id_exists THEN 'Has user_id'
        WHEN c2.creator_id_exists THEN 'Has creator_id'
        WHEN c2.profile_id_exists THEN 'Has profile_id'
        WHEN c2.id_exists AND t.table_name = 'profiles' THEN 'Is profiles table'
        ELSE 'No obvious user reference'
    END as user_reference
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name 
    AND t.table_schema = c.table_schema
LEFT JOIN LATERAL (
    SELECT 
        EXISTS(SELECT 1 FROM information_schema.columns c2 
               WHERE c2.table_name = t.table_name 
               AND c2.table_schema = t.table_schema 
               AND c2.column_name = 'user_id') as user_id_exists,
        EXISTS(SELECT 1 FROM information_schema.columns c2 
               WHERE c2.table_name = t.table_name 
               AND c2.table_schema = t.table_schema 
               AND c2.column_name = 'creator_id') as creator_id_exists,
        EXISTS(SELECT 1 FROM information_schema.columns c2 
               WHERE c2.table_name = t.table_name 
               AND c2.table_schema = t.table_schema 
               AND c2.column_name = 'profile_id') as profile_id_exists,
        EXISTS(SELECT 1 FROM information_schema.columns c2 
               WHERE c2.table_name = t.table_name 
               AND c2.table_schema = t.table_schema 
               AND c2.column_name = 'id') as id_exists
) c2 ON true
WHERE t.table_schema = 'public'
    AND t.table_name IN (
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
GROUP BY t.table_name, t.table_type, c2.user_id_exists, c2.creator_id_exists, c2.profile_id_exists, c2.id_exists
ORDER BY t.table_type, t.table_name;

-- Specifically check RLS status for tables only
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity = true THEN 'RLS Enabled ✓'
        ELSE 'RLS DISABLED ✗'
    END as rls_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' AND tablename = t.tablename
        ) THEN 'Has policies'
        ELSE 'No policies'
    END as policy_status
FROM pg_tables t
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
ORDER BY tablename;