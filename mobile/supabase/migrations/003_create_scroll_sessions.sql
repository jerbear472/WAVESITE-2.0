-- Create scroll_sessions table
CREATE TABLE IF NOT EXISTS public.scroll_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER DEFAULT 0,
  trends_logged INTEGER DEFAULT 0,
  earnings DECIMAL(10, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_scroll_sessions_user_id ON public.scroll_sessions(user_id);
CREATE INDEX idx_scroll_sessions_start_time ON public.scroll_sessions(start_time);
CREATE INDEX idx_scroll_sessions_status ON public.scroll_sessions(status);

-- Enable RLS
ALTER TABLE public.scroll_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own scroll sessions" ON public.scroll_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own scroll sessions" ON public.scroll_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own scroll sessions" ON public.scroll_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_scroll_sessions_updated_at BEFORE UPDATE ON public.scroll_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create earnings summary view
CREATE OR REPLACE VIEW public.earnings_summary AS
SELECT 
  user_id,
  COUNT(*) as total_sessions,
  SUM(duration_minutes) as total_minutes,
  SUM(trends_logged) as total_trends,
  SUM(earnings) as total_earnings,
  AVG(earnings) as avg_earnings_per_session,
  MAX(earnings) as best_session_earnings,
  DATE_TRUNC('week', start_time) as week
FROM public.scroll_sessions
WHERE status = 'completed'
GROUP BY user_id, DATE_TRUNC('week', start_time);

-- Grant permissions on the view
GRANT SELECT ON public.earnings_summary TO authenticated;