-- Add total_cashed_out column to track historical cashouts
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_cashed_out DECIMAL(10,2) DEFAULT 0.00;

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_dashboard_stats(UUID);

-- Create the updated get_user_dashboard_stats function to include total cashed out
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
  earnings_this_month DECIMAL(10,2),
  total_cashed_out DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total approved earnings (available to cash out)
    COALESCE((
      SELECT total_earnings 
      FROM public.profiles 
      WHERE id = p_user_id
    ), 0.00)::DECIMAL(10,2) as total_earnings,
    
    -- Pending earnings
    COALESCE((
      SELECT SUM(amount) 
      FROM public.earnings_ledger 
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
      FROM public.earnings_ledger 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND DATE(created_at) = CURRENT_DATE
    ), 0.00)::DECIMAL(10,2) as earnings_today,
    
    -- Earnings this week
    COALESCE((
      SELECT SUM(amount) 
      FROM public.earnings_ledger 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND created_at >= date_trunc('week', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2) as earnings_this_week,
    
    -- Earnings this month
    COALESCE((
      SELECT SUM(amount) 
      FROM public.earnings_ledger 
      WHERE user_id = p_user_id 
      AND status = 'approved'
      AND created_at >= date_trunc('month', CURRENT_DATE)
    ), 0.00)::DECIMAL(10,2) as earnings_this_month,
    
    -- Total cashed out (from profiles table)
    COALESCE((
      SELECT total_cashed_out 
      FROM public.profiles 
      WHERE id = p_user_id
    ), 0.00)::DECIMAL(10,2) as total_cashed_out;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;