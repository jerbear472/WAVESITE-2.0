#!/bin/bash

# Load environment variables
source .env.local

# SQL to create the voting system
SQL="-- Create trend_votes table for the 4-tier voting system
CREATE TABLE IF NOT EXISTS trend_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  vote_type VARCHAR(20) CHECK (vote_type IN ('wave', 'fire', 'declining', 'dead')),
  vote_value INTEGER CHECK (vote_value IN (-2, -1, 1, 2)),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(trend_id, user_id) -- One vote per user per trend
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_votes_trend_id ON trend_votes(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_votes_user_id ON trend_votes(user_id);

-- Function to cast or update a vote
CREATE OR REPLACE FUNCTION cast_trend_vote(
  p_user_id UUID,
  p_trend_id UUID,
  p_vote_type VARCHAR,
  p_vote_value INTEGER
)
RETURNS JSON AS \$\$
DECLARE
  v_result JSON;
  v_is_new_vote BOOLEAN;
  v_old_vote_type VARCHAR;
BEGIN
  -- Check if user already voted
  SELECT vote_type INTO v_old_vote_type
  FROM trend_votes
  WHERE user_id = p_user_id AND trend_id = p_trend_id;
  
  v_is_new_vote := v_old_vote_type IS NULL;
  
  -- Insert or update vote
  INSERT INTO trend_votes (user_id, trend_id, vote_type, vote_value)
  VALUES (p_user_id, p_trend_id, p_vote_type, p_vote_value)
  ON CONFLICT (trend_id, user_id)
  DO UPDATE SET 
    vote_type = p_vote_type,
    vote_value = p_vote_value,
    updated_at = NOW();
  
  -- Get updated trend data
  SELECT json_build_object(
    'success', true,
    'is_new_vote', v_is_new_vote,
    'old_vote_type', v_old_vote_type,
    'new_vote_type', p_vote_type,
    'heat_score', heat_score,
    'wave_votes', wave_votes,
    'fire_votes', fire_votes,
    'declining_votes', declining_votes,
    'dead_votes', dead_votes,
    'total_votes', total_votes
  ) INTO v_result
  FROM trend_submissions
  WHERE id = p_trend_id;
  
  RETURN v_result;
END;
\$\$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON trend_votes TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- Enable Row Level Security
ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY \"Users can view all votes\" ON trend_votes
  FOR SELECT USING (true);

CREATE POLICY \"Users can insert their own votes\" ON trend_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY \"Users can update their own votes\" ON trend_votes
  FOR UPDATE USING (auth.uid() = user_id);"

echo "Executing SQL..."

curl -X POST \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -d "{\"sql\": \"$SQL\"}"