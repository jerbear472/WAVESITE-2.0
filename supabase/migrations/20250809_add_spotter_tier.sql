-- Add spotter_tier column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS spotter_tier TEXT DEFAULT 'learning' 
CHECK (spotter_tier IN ('elite', 'verified', 'learning', 'restricted'));

-- Add column for tracking when tier was last updated
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS spotter_tier_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users to have learning tier by default
UPDATE profiles 
SET spotter_tier = 'learning', 
    spotter_tier_updated_at = NOW()
WHERE spotter_tier IS NULL;

-- Create an index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_spotter_tier ON profiles(spotter_tier);

-- Function to get tier multiplier
CREATE OR REPLACE FUNCTION get_spotter_tier_multiplier(tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE tier
        WHEN 'elite' THEN 1.5
        WHEN 'verified' THEN 1.0
        WHEN 'learning' THEN 0.7
        WHEN 'restricted' THEN 0.3
        ELSE 0.7 -- Default to learning multiplier
    END;
END;
$$ LANGUAGE plpgsql;

-- Update the earnings calculation to include spotter tier multiplier
CREATE OR REPLACE FUNCTION calculate_trend_earnings(
    p_user_id UUID,
    p_base_amount DECIMAL,
    p_bonuses JSONB DEFAULT '{}'::JSONB
)
RETURNS DECIMAL AS $$
DECLARE
    v_spotter_tier TEXT;
    v_tier_multiplier DECIMAL;
    v_final_amount DECIMAL;
BEGIN
    -- Get user's spotter tier
    SELECT spotter_tier INTO v_spotter_tier
    FROM profiles
    WHERE id = p_user_id;
    
    -- Get tier multiplier
    v_tier_multiplier := get_spotter_tier_multiplier(COALESCE(v_spotter_tier, 'learning'));
    
    -- Calculate final amount with tier multiplier
    v_final_amount := p_base_amount * v_tier_multiplier;
    
    -- Apply any additional bonuses from the JSONB parameter
    IF p_bonuses ? 'streak_multiplier' THEN
        v_final_amount := v_final_amount * (p_bonuses->>'streak_multiplier')::DECIMAL;
    END IF;
    
    RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN profiles.spotter_tier IS 'User spotter ranking: elite (1.5x), verified (1.0x), learning (0.7x), restricted (0.3x)';