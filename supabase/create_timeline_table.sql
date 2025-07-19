-- Create trend_timeline table for tracking wave scores over time
CREATE TABLE IF NOT EXISTS trend_timeline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL,
  wave_score INTEGER CHECK (wave_score >= 0 AND wave_score <= 100),
  validation_count INTEGER DEFAULT 0,
  engagement_rate DECIMAL(3,2),
  platform_reach INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_timeline_trend_id ON trend_timeline(trend_id);
CREATE INDEX IF NOT EXISTS idx_timeline_timestamp ON trend_timeline(timestamp);

-- Enable Row Level Security
ALTER TABLE trend_timeline ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read timeline data
CREATE POLICY "Timeline data is viewable by everyone" ON trend_timeline
  FOR SELECT USING (true);

-- Policy: Only authenticated users can insert timeline data
CREATE POLICY "Authenticated users can insert timeline data" ON trend_timeline
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);