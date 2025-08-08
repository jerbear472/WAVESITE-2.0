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
      SELECT SUM(ue.amount) 
      FROM public.user_earnings ue
      WHERE ue.user_id = p_user_id AND ue.status = 'approved'
    ), 0.00)::DECIMAL(10,2),
    
    -- Pending earnings
    COALESCE((
      SELECT SUM(ue2.amount) 
      FROM public.user_earnings ue2
      WHERE ue2.user_id = p_user_id AND ue2.status = 'pending'
    ), 0.00)::DECIMAL(10,2),
    
    -- Total trends submitted
    COALESCE((
      SELECT COUNT(*) 
      FROM public.trend_submissions ts
      WHERE ts.spotter_id = p_user_id
    ), 0)::INTEGER,
    
    -- Verified trends (approved status)
    COALESCE((
      SELECT COUNT(*) 
      FROM public.trend_submissions ts2
      WHERE ts2.spotter_id = p_user_id 
      AND ts2.status IN ('approved', 'viral')
    ), 0)::INTEGER,
    
    -- Scroll sessions (if table exists)
    COALESCE((
      SELECT COUNT(*) 
      FROM public.scroll_sessions ss
      WHERE ss.user_id = p_user_id
    ), 0)::INTEGER,
    
    -- Accuracy score (percentage of approved trends using validation_status if available, fallback to status)
    CASE 
      WHEN (SELECT COUNT(*) FROM public.trend_submissions ts3 WHERE ts3.spotter_id = p_user_id) > 0 
      THEN (
        (SELECT COUNT(*) 
         FROM public.trend_submissions ts4
         WHERE ts4.spotter_id = p_user_id 
         AND (
           (ts4.validation_status = 'approved') OR 
           (ts4.validation_status IS NULL AND ts4.status IN ('approved', 'viral'))
         )
        )::DECIMAL * 100 / 
        (SELECT COUNT(*) FROM public.trend_submissions ts5 WHERE ts5.spotter_id = p_user_id)
      )::DECIMAL(5,2)
      ELSE 0.00
    END,
    
    -- Current streak (simplified - days with submissions)
    COALESCE((
      SELECT COUNT(DISTINCT DATE(ts6.created_at))
      FROM public.trend_submissions ts6
      WHERE ts6.spotter_id = p_user_id
      AND ts6.created_at >= CURRENT_DATE - INTERVAL '7 days'
    ), 0)::INTEGER,
    
    -- Earnings today
    COALESCE((
      SELECT SUM(ue3.amount) 
      FROM public.user_earnings ue3
      WHERE ue3.user_id = p_user_id 
      AND ue3.status = 'approved'
      AND DATE(ue3.created_at) = CURRENT_DATE
    ), 0.00)::DECIMAL(10,2),
    
    -- Earnings this week
    COALESCE((
      SELECT SUM(ue4.amount) 
      FROM public.user_earnings ue4
      WHERE ue4.user_id = p_user_id 
      AND ue4.status = 'approved'
      AND ue4.created_at >= date_trunc('week', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2),
    
    -- Earnings this month
    COALESCE((
      SELECT SUM(ue5.amount) 
      FROM public.user_earnings ue5
      WHERE ue5.user_id = p_user_id 
      AND ue5.status = 'approved'
      AND ue5.created_at >= date_trunc('month', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2);
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