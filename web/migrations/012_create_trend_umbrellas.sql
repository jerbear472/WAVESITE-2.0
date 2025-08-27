-- Create trend_umbrellas table to group similar trends
CREATE TABLE IF NOT EXISTS trend_umbrellas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  -- Vector embedding for cosine similarity matching
  embedding vector(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  -- Statistics
  submission_count INTEGER DEFAULT 0,
  total_engagement BIGINT DEFAULT 0, -- Sum of all engagement metrics
  avg_virality_score DECIMAL(3,2) DEFAULT 0,
  -- Metadata
  first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  peak_date TIMESTAMP WITH TIME ZONE,
  status VARCHAR(50) DEFAULT 'emerging', -- emerging, trending, viral, declining
  -- Top hashtags and keywords
  common_hashtags TEXT[] DEFAULT '{}',
  keywords TEXT[] DEFAULT '{}',
  
  -- Indexes for performance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add trend_umbrella_id to trend_submissions
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS trend_umbrella_id UUID REFERENCES trend_umbrellas(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_trend_submissions_umbrella 
ON trend_submissions(trend_umbrella_id);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS idx_trend_umbrellas_embedding 
ON trend_umbrellas USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Function to update umbrella statistics
CREATE OR REPLACE FUNCTION update_trend_umbrella_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.trend_umbrella_id IS NOT NULL THEN
    UPDATE trend_umbrellas
    SET 
      submission_count = (
        SELECT COUNT(*) 
        FROM trend_submissions 
        WHERE trend_umbrella_id = NEW.trend_umbrella_id
      ),
      total_engagement = (
        SELECT SUM(COALESCE(likes_count, 0) + COALESCE(comments_count, 0) + 
                   COALESCE(shares_count, 0) + COALESCE(views_count, 0))
        FROM trend_submissions 
        WHERE trend_umbrella_id = NEW.trend_umbrella_id
      ),
      last_updated_at = NOW()
    WHERE id = NEW.trend_umbrella_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update stats
CREATE TRIGGER update_umbrella_stats_trigger
AFTER INSERT OR UPDATE ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION update_trend_umbrella_stats();

-- Sample query to find similar trends using cosine similarity
-- This would be used when a new trend is submitted
/*
SELECT 
  id,
  name,
  1 - (embedding <=> query_embedding) as similarity
FROM trend_umbrellas
WHERE 1 - (embedding <=> query_embedding) > 0.8
ORDER BY similarity DESC
LIMIT 5;
*/