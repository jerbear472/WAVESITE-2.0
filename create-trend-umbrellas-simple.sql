-- Create trend_umbrellas table without vector extension requirement
-- This is a simplified version that will work without pgvector

CREATE TABLE IF NOT EXISTS trend_umbrellas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Statistics
  submission_count INTEGER DEFAULT 0,
  total_engagement BIGINT DEFAULT 0,
  avg_virality_score DECIMAL(3,2) DEFAULT 0,
  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  peak_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'emerging', -- emerging, trending, viral, declining
  -- Top hashtags and keywords
  common_hashtags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trend_umbrella_id to trend_submissions if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'trend_submissions' 
                 AND column_name = 'trend_umbrella_id') THEN
    ALTER TABLE trend_submissions 
    ADD COLUMN trend_umbrella_id UUID REFERENCES trend_umbrellas(id);
  END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trend_submissions_umbrella 
ON trend_submissions(trend_umbrella_id);

-- Create index on name for text search
CREATE INDEX IF NOT EXISTS idx_trend_umbrellas_name 
ON trend_umbrellas(name);

-- Enable RLS
ALTER TABLE trend_umbrellas ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all umbrellas
CREATE POLICY "Anyone can view trend umbrellas"
ON trend_umbrellas FOR SELECT
USING (true);

-- Allow system to create/update umbrellas (via service role)
CREATE POLICY "Service role can manage umbrellas"
ON trend_umbrellas FOR ALL
USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT ON trend_umbrellas TO authenticated;
GRANT SELECT ON trend_umbrellas TO anon;

-- Success message
SELECT 'Trend umbrellas table created successfully!' as result;