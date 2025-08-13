-- Add multiplier columns to scroll_sessions table if they don't exist
ALTER TABLE scroll_sessions 
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,2) DEFAULT 1.0;

-- Add comment for documentation
COMMENT ON COLUMN scroll_sessions.tier_multiplier IS 'User tier multiplier applied to earnings (e.g., 1.5x for verified tier)';
COMMENT ON COLUMN scroll_sessions.streak_multiplier IS 'Streak bonus multiplier applied to earnings (e.g., 2x for 5-day streak)';

-- Add spotter_tier column to profiles if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS spotter_tier VARCHAR(20) DEFAULT 'learning' CHECK (spotter_tier IN ('master', 'elite', 'verified', 'learning', 'restricted'));

-- Add comment for documentation
COMMENT ON COLUMN profiles.spotter_tier IS 'User performance tier determining earning multipliers';

-- Update existing profiles to set spotter_tier based on their performance
UPDATE profiles
SET spotter_tier = CASE
    WHEN trends_submitted >= 100 AND approval_rate >= 0.80 AND quality_score >= 0.80 THEN 'master'
    WHEN trends_submitted >= 50 AND approval_rate >= 0.70 AND quality_score >= 0.70 THEN 'elite'
    WHEN trends_submitted >= 10 AND approval_rate >= 0.60 AND quality_score >= 0.60 THEN 'verified'
    WHEN approval_rate < 0.30 OR quality_score < 0.30 THEN 'restricted'
    ELSE 'learning'
END
WHERE spotter_tier IS NULL OR spotter_tier = 'learning';

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_profiles_spotter_tier ON profiles(spotter_tier);
CREATE INDEX IF NOT EXISTS idx_scroll_sessions_multipliers ON scroll_sessions(tier_multiplier, streak_multiplier);

-- Function to calculate tier based on user stats
CREATE OR REPLACE FUNCTION calculate_user_tier(
    p_trends_submitted INTEGER,
    p_approval_rate DECIMAL,
    p_quality_score DECIMAL
) RETURNS VARCHAR(20) AS $$
BEGIN
    -- Check for restricted status first
    IF p_approval_rate < 0.30 OR p_quality_score < 0.30 THEN
        RETURN 'restricted';
    END IF;
    
    -- Check tier progression
    IF p_trends_submitted >= 100 AND p_approval_rate >= 0.80 AND p_quality_score >= 0.80 THEN
        RETURN 'master';
    END IF;
    
    IF p_trends_submitted >= 50 AND p_approval_rate >= 0.70 AND p_quality_score >= 0.70 THEN
        RETURN 'elite';
    END IF;
    
    IF p_trends_submitted >= 10 AND p_approval_rate >= 0.60 AND p_quality_score >= 0.60 THEN
        RETURN 'verified';
    END IF;
    
    RETURN 'learning';
END;
$$ LANGUAGE plpgsql;

-- Function to get tier multiplier
CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier VARCHAR(20)) 
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql;

-- Update function to automatically update user tier when stats change
CREATE OR REPLACE FUNCTION update_user_tier() RETURNS TRIGGER AS $$
BEGIN
    NEW.spotter_tier := calculate_user_tier(
        NEW.trends_submitted,
        NEW.approval_rate,
        NEW.quality_score
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update tier
DROP TRIGGER IF EXISTS update_user_tier_trigger ON profiles;
CREATE TRIGGER update_user_tier_trigger
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    WHEN (OLD.trends_submitted IS DISTINCT FROM NEW.trends_submitted 
       OR OLD.approval_rate IS DISTINCT FROM NEW.approval_rate
       OR OLD.quality_score IS DISTINCT FROM NEW.quality_score)
    EXECUTE FUNCTION update_user_tier();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calculate_user_tier TO authenticated;
GRANT EXECUTE ON FUNCTION get_tier_multiplier TO authenticated;