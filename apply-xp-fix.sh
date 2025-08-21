#!/bin/bash

echo "Applying XP View Fix to Supabase..."
echo "===================================="

# Create a temporary SQL file with the fix
cat > /tmp/fix_xp_view.sql << 'EOF'
-- Fix user_xp_summary view to use profiles table
DROP VIEW IF EXISTS user_xp_summary CASCADE;

CREATE VIEW user_xp_summary AS
SELECT 
    p.id as user_id,
    p.username,
    COALESCE(ux.total_xp, 0) as total_xp,
    COALESCE(ux.current_level, 1) as level,
    CASE COALESCE(ux.current_level, 1)
        WHEN 1 THEN 'Observer'
        WHEN 2 THEN 'Recorder'  
        WHEN 3 THEN 'Tracker'
        WHEN 4 THEN 'Tracker'
        WHEN 5 THEN 'Analyst'
        WHEN 6 THEN 'Interpreter'
        WHEN 7 THEN 'Specialist'
        WHEN 8 THEN 'Expert'
        WHEN 9 THEN 'Scholar'
        WHEN 10 THEN 'Researcher'
        WHEN 11 THEN 'Authority'
        WHEN 12 THEN 'Pioneer'
        WHEN 13 THEN 'Visionary'
        WHEN 14 THEN 'Master'
        WHEN 15 THEN 'Legend'
        ELSE 'Observer'
    END as level_title,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = p.id), 0) as total_trends_submitted,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = p.id AND ts.approval_status = 'approved'), 0) as validated_trends,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = p.id AND ts.approval_status = 'rejected'), 0) as rejected_trends,
    COALESCE((SELECT COUNT(*) FROM trend_submissions ts WHERE ts.spotter_id = p.id AND ts.approval_status = 'pending'), 0) as pending_trends
FROM profiles p
LEFT JOIN user_xp ux ON ux.user_id = p.id;

GRANT SELECT ON user_xp_summary TO authenticated;
GRANT SELECT ON user_xp_summary TO anon;

-- Test the fix
SELECT 'Testing Trendsetter XP:' as status;
SELECT user_id, username, total_xp, level, level_title 
FROM user_xp_summary 
WHERE user_id = 'b8fbbb0b-b30d-4f6c-91da-baed848dec13';
EOF

echo "SQL fix has been created at /tmp/fix_xp_view.sql"
echo ""
echo "To apply this fix, you have two options:"
echo ""
echo "OPTION 1: Use Supabase Dashboard"
echo "================================"
echo "1. Go to: https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/sql/new"
echo "2. Copy and paste the SQL from /tmp/fix_xp_view.sql"
echo "3. Click 'Run'"
echo ""
echo "OPTION 2: Use psql (if you have it installed)"
echo "=============================================="
echo "psql 'postgresql://postgres:qIvwos-vujzy1-dopzeb@db.aicahushpcslwjwrlqbo.supabase.co:5432/postgres' < /tmp/fix_xp_view.sql"
echo ""
echo "After applying the fix, test it by refreshing the dashboard!"