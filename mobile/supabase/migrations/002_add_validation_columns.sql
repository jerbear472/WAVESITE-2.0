-- Add validation-related columns to captured_trends table
ALTER TABLE captured_trends 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending_validation',
ADD COLUMN IF NOT EXISTS validation_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS positive_votes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS skip_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

-- Create index for validation queries
CREATE INDEX IF NOT EXISTS idx_captured_trends_status ON captured_trends(status);
CREATE INDEX IF NOT EXISTS idx_captured_trends_validation_count ON captured_trends(validation_count);

-- Create validations table if it doesn't exist
CREATE TABLE IF NOT EXISTS validations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trend_id UUID REFERENCES captured_trends(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote VARCHAR(10) NOT NULL CHECK (vote IN ('yes', 'no', 'skip')),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, user_id)
);

-- Create indexes for validations table
CREATE INDEX IF NOT EXISTS idx_validations_trend_id ON validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_validations_user_id ON validations(user_id);
CREATE INDEX IF NOT EXISTS idx_validations_timestamp ON validations(timestamp DESC);

-- Enable RLS on validations table
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for validations table
CREATE POLICY "Users can view all validations"
  ON validations FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own validations"
  ON validations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own validations"
  ON validations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);