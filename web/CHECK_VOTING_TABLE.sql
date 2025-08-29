-- Check if trend_user_votes table exists and has proper structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public' 
    AND table_name = 'trend_user_votes';

-- Check RLS policies
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM 
    pg_policies
WHERE 
    schemaname = 'public' 
    AND tablename = 'trend_user_votes';

-- Check if table has any data
SELECT COUNT(*) as total_votes FROM public.trend_user_votes;

-- Sample some recent votes
SELECT 
    tuv.*,
    p.username as voter_username,
    ts.title as trend_title
FROM 
    public.trend_user_votes tuv
LEFT JOIN 
    public.profiles p ON tuv.user_id = p.id
LEFT JOIN 
    public.trend_submissions ts ON tuv.trend_id = ts.id
ORDER BY 
    tuv.created_at DESC
LIMIT 10;