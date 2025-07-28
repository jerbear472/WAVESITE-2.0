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

-- Update the process_cashout_request function to track total cashed out
CREATE OR REPLACE FUNCTION process_cashout_request(
    request_id UUID,
    admin_action TEXT,
    admin_notes TEXT DEFAULT NULL,
    transaction_id TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id UUID;
    v_amount DECIMAL(10,2);
    v_current_balance DECIMAL(10,2);
BEGIN
    -- Get request details
    SELECT user_id, amount INTO v_user_id, v_amount
    FROM public.cashout_requests
    WHERE id = request_id AND status = 'pending';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Request not found or not pending';
    END IF;
    
    -- Get current balance
    SELECT total_earnings INTO v_current_balance
    FROM public.profiles
    WHERE id = v_user_id;
    
    -- Process based on action
    IF admin_action = 'approve' THEN
        -- Check balance
        IF v_current_balance < v_amount THEN
            RAISE EXCEPTION 'Insufficient balance';
        END IF;
        
        -- Update the cashout request
        UPDATE public.cashout_requests
        SET 
            status = 'approved',
            processed_at = NOW(),
            processed_by = auth.uid(),
            admin_notes = process_cashout_request.admin_notes,
            transaction_id = process_cashout_request.transaction_id
        WHERE id = request_id;
        
        -- Update user profile - deduct from available balance and add to total cashed out
        UPDATE public.profiles
        SET 
            total_earnings = total_earnings - v_amount,
            total_cashed_out = COALESCE(total_cashed_out, 0) + v_amount,
            updated_at = NOW()
        WHERE id = v_user_id;
        
        -- Create earnings ledger entry for the cashout
        INSERT INTO public.earnings_ledger (
            user_id,
            amount,
            type,
            status,
            description,
            reference_id
        ) VALUES (
            v_user_id,
            -v_amount, -- Negative amount for cashout
            'cashout',
            'approved',
            'Cash out to Venmo',
            request_id
        );
        
    ELSIF admin_action = 'reject' THEN
        -- Update the cashout request
        UPDATE public.cashout_requests
        SET 
            status = 'rejected',
            processed_at = NOW(),
            processed_by = auth.uid(),
            admin_notes = process_cashout_request.admin_notes
        WHERE id = request_id;
    ELSE
        RAISE EXCEPTION 'Invalid action. Must be approve or reject';
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_dashboard_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION process_cashout_request(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- Populate total_cashed_out for existing users based on completed cashout requests
UPDATE public.profiles p
SET total_cashed_out = COALESCE((
    SELECT SUM(amount)
    FROM public.cashout_requests
    WHERE user_id = p.id
    AND status = 'completed'
), 0.00);