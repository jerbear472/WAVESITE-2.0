-- Check which items are tables vs views
-- This will help us understand what we're dealing with

-- Check all tables
SELECT 
    'TABLE' as object_type,
    schemaname,
    tablename as object_name,
    CASE 
        WHEN rowsecurity = true THEN 'RLS Enabled ✓'
        ELSE 'RLS DISABLED ✗ (Unrestricted)'
    END as security_status
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

UNION ALL

-- Check all views
SELECT 
    'VIEW' as object_type,
    schemaname,
    viewname as object_name,
    'Views cannot have RLS - Security depends on underlying tables' as security_status
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

ORDER BY object_type, object_name;

-- Also check what these views are based on
SELECT 
    viewname,
    definition
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
    );