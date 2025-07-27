-- Update the dashboard stats function to include real earnings data

-- First, create or replace the function to get user dashboard stats
CREATE OR REPLACE FUNCTION get_user_dashboard_stats(p_user_id UUID)
RETURNS TABLE (
  total_earnings DECIMAL(10,2),
  pending_earnings DECIMAL(10,2),
  trends_spotted INTEGER,
  trends_verified INTEGER,
  scroll_sessions_count INTEGER,
  accuracy_score DECIMAL(5,2),
  current_streak INTEGER,
  earnings_today DECIMAL(10,2),
  earnings_this_week DECIMAL(10,2),
  earnings_this_month DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total approved earnings
    COALESCE((
      SELECT SUM(amount) 
      FROM public.user_earnings 
      WHERE user_id = p_user_id AND status = 'approved'
    ), 0.00)::DECIMAL(10,2) as total_earnings,
    
    -- Pending earnings
    COALESCE((
      SELECT SUM(amount) 
      FROM public.user_earnings 
      WHERE user_id = p_user_id AND status = 'pending'
    ), 0.00)::DECIMAL(10,2) as pending_earnings,
    
    -- Total trends submitted
    COALESCE((
      SELECT COUNT(*) 
      FROM public.trend_submissions 
      WHERE spotter_id = p_user_id
    ), 0)::INTEGER as trends_spotted,
    
    -- Verified trends (approved status)
    COALESCE((
      SELECT COUNT(*) 
      FROM public.trend_submissions 
      WHERE spotter_id = p_user_id 
      AND status IN ('approved', 'viral')
    ), 0)::INTEGER as trends_verified,
    
    -- Scroll sessions (if table exists)
    COALESCE((
      SELECT COUNT(*) 
      FROM public.scroll_sessions 
      WHERE user_id = p_user_id
    ), 0)::INTEGER as scroll_sessions_count,
    
    -- Accuracy score (percentage of approved trends)
    CASE 
      WHEN (SELECT COUNT(*) FROM public.trend_submissions WHERE spotter_id = p_user_id) > 0 
      THEN (
        (SELECT COUNT(*) FROM public.trend_submissions WHERE spotter_id = p_user_id AND status IN ('approved', 'viral'))::DECIMAL * 100 / 
        (SELECT COUNT(*) FROM public.trend_submissions WHERE spotter_id = p_user_id)
      )::DECIMAL(5,2)
      ELSE 0.00
    END as accuracy_score,
    
    -- Current streak (simplified - days with submissions)
    COALESCE((
      SELECT COUNT(DISTINCT DATE(created_at))
      FROM public.trend_submissions
      WHERE spotter_id = p_user_id
      AND created_at >= CURRENT_DATE - INTERVAL '7 days'
    ), 0)::INTEGER as current_streak,
    
    -- Earnings today
    COALESCE((
      SELECT SUM(amount) 
      FROM public.user_earnings 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND DATE(created_at) = CURRENT_DATE
    ), 0.00)::DECIMAL(10,2) as earnings_today,
    
    -- Earnings this week
    COALESCE((
      SELECT SUM(amount) 
      FROM public.user_earnings 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND created_at >= date_trunc('week', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2) as earnings_this_week,
    
    -- Earnings this month
    COALESCE((
      SELECT SUM(amount) 
      FROM public.user_earnings 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2) as earnings_this_month;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;

-- Create a real-time subscription for earnings updates
CREATE OR REPLACE FUNCTION notify_earnings_change()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM pg_notify(
    'earnings_update',
    json_build_object(
      'user_id', NEW.user_id,
      'amount', NEW.amount,
      'type', NEW.type,
      'total_earnings', (
        SELECT SUM(amount) 
        FROM public.user_earnings 
        WHERE user_id = NEW.user_id AND status = 'approved'
      )
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for real-time updates
DROP TRIGGER IF EXISTS trigger_notify_earnings ON public.user_earnings;
CREATE TRIGGER trigger_notify_earnings
  AFTER INSERT OR UPDATE ON public.user_earnings
  FOR EACH ROW
  EXECUTE FUNCTION notify_earnings_change();

-- Test the function with a sample user
DO $$
DECLARE
  test_user_id UUID;
BEGIN
  -- Get a user ID that has trends
  SELECT DISTINCT spotter_id INTO test_user_id 
  FROM public.trend_submissions 
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the function
    RAISE NOTICE 'Testing dashboard stats for user %', test_user_id;
    
    -- Show the results
    PERFORM * FROM get_user_dashboard_stats(test_user_id);
    RAISE NOTICE 'Dashboard stats function working correctly';
  ELSE
    RAISE NOTICE 'No users with trends found for testing';
  END IF;
END $$;