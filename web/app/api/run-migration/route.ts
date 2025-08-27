import { NextResponse } from 'next/server';

export async function POST() {
  // Return the complete SQL for the voting system migration
  const migrationSQL = `
-- Create trend_votes table for the 4-tier voting system
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
RETURNS JSON AS $$
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
  
  -- Recalculate vote counts for the trend
  UPDATE trend_submissions
  SET 
    wave_votes = (SELECT COUNT(*) FROM trend_votes WHERE trend_id = p_trend_id AND vote_type = 'wave'),
    fire_votes = (SELECT COUNT(*) FROM trend_votes WHERE trend_id = p_trend_id AND vote_type = 'fire'),
    declining_votes = (SELECT COUNT(*) FROM trend_votes WHERE trend_id = p_trend_id AND vote_type = 'declining'),
    dead_votes = (SELECT COUNT(*) FROM trend_votes WHERE trend_id = p_trend_id AND vote_type = 'dead'),
    total_votes = (SELECT COUNT(*) FROM trend_votes WHERE trend_id = p_trend_id),
    heat_score = (
      SELECT COALESCE(SUM(vote_value), 0) 
      FROM trend_votes 
      WHERE trend_id = p_trend_id
    ),
    updated_at = NOW()
  WHERE id = p_trend_id;
  
  -- Get updated trend data
  SELECT json_build_object(
    'success', true,
    'is_new_vote', v_is_new_vote,
    'old_vote_type', v_old_vote_type,
    'new_vote_type', p_vote_type,
    'heat_score', COALESCE(heat_score, 0),
    'wave_votes', COALESCE(wave_votes, 0),
    'fire_votes', COALESCE(fire_votes, 0),
    'declining_votes', COALESCE(declining_votes, 0),
    'dead_votes', COALESCE(dead_votes, 0),
    'total_votes', COALESCE(total_votes, 0)
  ) INTO v_result
  FROM trend_submissions
  WHERE id = p_trend_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON trend_votes TO authenticated;
GRANT EXECUTE ON FUNCTION cast_trend_vote TO authenticated;

-- Enable Row Level Security
ALTER TABLE trend_votes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view all votes" ON trend_votes;
CREATE POLICY "Users can view all votes" ON trend_votes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own votes" ON trend_votes;
CREATE POLICY "Users can insert their own votes" ON trend_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own votes" ON trend_votes;
CREATE POLICY "Users can update their own votes" ON trend_votes
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own votes" ON trend_votes;
CREATE POLICY "Users can delete their own votes" ON trend_votes
  FOR DELETE USING (auth.uid() = user_id);
`;

  return NextResponse.json({
    success: true,
    message: 'Copy this SQL and run it in your Supabase SQL Editor:',
    url: 'https://supabase.com/dashboard/project/aicahushpcslwjwrlqbo/sql',
    sql: migrationSQL.trim()
  });
}