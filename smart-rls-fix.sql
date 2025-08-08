-- Smart RLS Fix: Adapts to actual table structure
-- This script checks column names before applying policies

-- First, run the inspection to see what we're working with
DO $$
BEGIN
    RAISE NOTICE 'Inspecting table structures and applying appropriate RLS...';
END $$;

-- Function to safely enable RLS and create policies based on actual columns
CREATE OR REPLACE FUNCTION apply_smart_rls(table_name text) RETURNS void AS $$
DECLARE
    has_user_id boolean;
    has_creator_id boolean;
    has_profile_id boolean;
    has_organization_id boolean;
    is_table boolean;
    policy_applied boolean := false;
BEGIN
    -- Check if it's actually a table (not a view)
    SELECT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = table_name
    ) INTO is_table;
    
    IF NOT is_table THEN
        RAISE NOTICE '% is not a table, skipping RLS', table_name;
        RETURN;
    END IF;
    
    -- Check what user-related columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = apply_smart_rls.table_name 
        AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = apply_smart_rls.table_name 
        AND column_name = 'creator_id'
    ) INTO has_creator_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = apply_smart_rls.table_name 
        AND column_name = 'profile_id'
    ) INTO has_profile_id;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = apply_smart_rls.table_name 
        AND column_name = 'organization_id'
    ) INTO has_organization_id;
    
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    RAISE NOTICE 'Enabled RLS on %', table_name;
    
    -- Drop existing policies to avoid conflicts
    FOR policy_name IN 
        SELECT policyname FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = apply_smart_rls.table_name
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);
    END LOOP;
    
    -- Apply appropriate policies based on columns and table name
    
    -- Special handling for specific tables
    IF table_name = 'profiles' THEN
        EXECUTE format('CREATE POLICY "Public profiles are viewable by everyone" ON %I FOR SELECT USING (true)', table_name);
        EXECUTE format('CREATE POLICY "Users can update own profile" ON %I FOR UPDATE USING (auth.uid() = id)', table_name);
        EXECUTE format('CREATE POLICY "Users can insert own profile" ON %I FOR INSERT WITH CHECK (auth.uid() = id)', table_name);
        policy_applied := true;
        
    ELSIF table_name = 'achievements' AND has_profile_id THEN
        -- achievements likely uses profile_id instead of user_id
        EXECUTE format('CREATE POLICY "Users can view their own achievements" ON %I FOR SELECT USING (auth.uid() = profile_id)', table_name);
        EXECUTE format('CREATE POLICY "System can manage achievements" ON %I FOR ALL USING (auth.uid() = profile_id OR auth.role() = ''service_role'')', table_name);
        policy_applied := true;
        
    ELSIF table_name IN ('daily_challenges', 'campaigns') THEN
        -- These might be public read tables
        EXECUTE format('CREATE POLICY "Anyone can view %s" ON %I FOR SELECT USING (true)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only admins can manage %s" ON %I FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only admins can update %s" ON %I FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only admins can delete %s" ON %I FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))', table_name, table_name);
        policy_applied := true;
        
    -- Generic policies based on column structure
    ELSIF has_user_id THEN
        EXECUTE format('CREATE POLICY "Users can view their own %s" ON %I FOR SELECT USING (auth.uid() = user_id)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can insert their own %s" ON %I FOR INSERT WITH CHECK (auth.uid() = user_id)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can update their own %s" ON %I FOR UPDATE USING (auth.uid() = user_id)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can delete their own %s" ON %I FOR DELETE USING (auth.uid() = user_id)', table_name, table_name);
        policy_applied := true;
        
    ELSIF has_creator_id THEN
        EXECUTE format('CREATE POLICY "Creators can view their own %s" ON %I FOR SELECT USING (auth.uid() = creator_id)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Creators can manage their own %s" ON %I FOR ALL USING (auth.uid() = creator_id)', table_name, table_name);
        policy_applied := true;
        
    ELSIF has_profile_id THEN
        EXECUTE format('CREATE POLICY "Users can view their own %s" ON %I FOR SELECT USING (auth.uid() = profile_id)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Users can manage their own %s" ON %I FOR ALL USING (auth.uid() = profile_id)', table_name, table_name);
        policy_applied := true;
        
    ELSIF has_organization_id THEN
        EXECUTE format('CREATE POLICY "Organizations can view their own %s" ON %I FOR SELECT USING (auth.uid()::text = organization_id::text)', table_name, table_name);
        EXECUTE format('CREATE POLICY "Organizations can manage their own %s" ON %I FOR ALL USING (auth.uid()::text = organization_id::text)', table_name, table_name);
        policy_applied := true;
        
    ELSE
        -- Table has no obvious user reference - make it admin only for safety
        EXECUTE format('CREATE POLICY "Only admins can view %s" ON %I FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))', table_name, table_name);
        EXECUTE format('CREATE POLICY "Only admins can manage %s" ON %I FOR ALL USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true))', table_name, table_name);
        policy_applied := true;
        RAISE NOTICE 'Table % has no user reference columns - restricted to admins only', table_name;
    END IF;
    
    IF policy_applied THEN
        RAISE NOTICE 'Applied policies to %', table_name;
    END IF;
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error processing %: %', table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Apply smart RLS to all potentially unrestricted tables
DO $$
DECLARE
    tbl text;
BEGIN
    FOR tbl IN 
        SELECT unnest(ARRAY[
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
        ])
    LOOP
        PERFORM apply_smart_rls(tbl);
    END LOOP;
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS apply_smart_rls(text);

-- Final report: Show what we accomplished
SELECT 
    t.tablename as "Table Name",
    CASE 
        WHEN t.rowsecurity = true THEN '✅ RLS Enabled'
        ELSE '❌ RLS Disabled'
    END as "RLS Status",
    COUNT(p.policyname) as "Policy Count",
    STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) as "Policies"
FROM pg_tables t
LEFT JOIN pg_policies p 
    ON t.tablename = p.tablename 
    AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
    AND t.tablename IN (
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
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Show views separately (they can't have RLS)
SELECT 
    'VIEW: ' || viewname as "View Name",
    '📋 Inherits from base tables' as "Security Note"
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
ORDER BY viewname;