-- Add earnings system for trend submissions
-- Each trend submission earns $0.10

-- Step 1: Create earnings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.user_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'trend_submission', 'validation', 'bonus', etc.
  description TEXT,
  trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'paid'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create an index for performance
CREATE INDEX IF NOT EXISTS idx_user_earnings_user_id ON public.user_earnings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_earnings_trend_id ON public.user_earnings(trend_id);

-- Step 3: Enable RLS
ALTER TABLE public.user_earnings ENABLE ROW LEVEL SECURITY;

-- Step 4: Create policies
DROP POLICY IF EXISTS "Users can view own earnings" ON public.user_earnings;
CREATE POLICY "Users can view own earnings" ON public.user_earnings
  FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "System can create earnings" ON public.user_earnings;
CREATE POLICY "System can create earnings" ON public.user_earnings
  FOR INSERT WITH CHECK (true);

-- Step 5: Create a function to automatically add earnings when a trend is submitted
CREATE OR REPLACE FUNCTION add_trend_submission_earning()
RETURNS TRIGGER AS $$
BEGIN
  -- Add $0.10 earning for the trend submission
  INSERT INTO public.user_earnings (
    user_id,
    amount,
    type,
    description,
    trend_id,
    status
  ) VALUES (
    NEW.spotter_id,
    0.10,
    'trend_submission',
    'Earned for submitting trend: ' || COALESCE(NEW.evidence->>'title', 'Untitled'),
    NEW.id,
    'approved' -- Auto-approve for now
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger for new trend submissions
DROP TRIGGER IF EXISTS trigger_add_trend_earning ON public.trend_submissions;
CREATE TRIGGER trigger_add_trend_earning
  AFTER INSERT ON public.trend_submissions
  FOR EACH ROW
  EXECUTE FUNCTION add_trend_submission_earning();

-- Step 7: Add earnings for existing trends (retroactive payment)
INSERT INTO public.user_earnings (user_id, amount, type, description, trend_id, status)
SELECT 
  spotter_id,
  0.10,
  'trend_submission',
  'Retroactive payment for trend: ' || COALESCE(evidence->>'title', 'Untitled'),
  id,
  'approved'
FROM public.trend_submissions
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_earnings 
  WHERE trend_id = trend_submissions.id
);

-- Step 8: Create a view for user earnings summary
CREATE OR REPLACE VIEW public.user_earnings_summary AS
SELECT 
  user_id,
  SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as total_earnings,
  SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_earnings,
  SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_out,
  COUNT(DISTINCT trend_id) as trends_submitted,
  MAX(created_at) as last_earning_date
FROM public.user_earnings
GROUP BY user_id;

-- Step 9: Grant permissions
GRANT SELECT ON public.user_earnings TO authenticated;
GRANT SELECT ON public.user_earnings_summary TO authenticated;

-- Step 10: Update the profiles table to include earnings
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0;

-- Step 11: Update profiles with current earnings
UPDATE public.profiles p
SET 
  total_earnings = COALESCE((
    SELECT SUM(amount) 
    FROM public.user_earnings 
    WHERE user_id = p.id AND status = 'approved'
  ), 0),
  pending_earnings = COALESCE((
    SELECT SUM(amount) 
    FROM public.user_earnings 
    WHERE user_id = p.id AND status = 'pending'
  ), 0),
  trends_spotted = COALESCE((
    SELECT COUNT(*) 
    FROM public.trend_submissions 
    WHERE spotter_id = p.id
  ), 0);

-- Verify the setup
SELECT 
  'Earnings system installed!' as status,
  COUNT(*) as total_earnings_records,
  SUM(amount) as total_payout_amount
FROM public.user_earnings;