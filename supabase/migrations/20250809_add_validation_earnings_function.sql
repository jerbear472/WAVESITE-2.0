-- Function to calculate validation earnings with spotter tier multiplier
CREATE OR REPLACE FUNCTION calculate_validation_earnings(
    p_validator_id UUID,
    p_trend_id UUID,
    p_is_confirmed BOOLEAN,
    p_confidence_score DECIMAL DEFAULT 0.5
)
RETURNS DECIMAL AS $$
DECLARE
    v_spotter_tier TEXT;
    v_tier_multiplier DECIMAL;
    v_base_amount DECIMAL;
    v_final_amount DECIMAL;
    v_is_consensus BOOLEAN;
    v_time_bonus DECIMAL;
BEGIN
    -- Get validator's spotter tier
    SELECT spotter_tier INTO v_spotter_tier
    FROM profiles
    WHERE id = p_validator_id;
    
    -- Get tier multiplier
    v_tier_multiplier := get_spotter_tier_multiplier(COALESCE(v_spotter_tier, 'learning'));
    
    -- Base validation reward
    v_base_amount := 0.01; -- 1 cent base
    
    -- Check if validator agrees with consensus (majority)
    SELECT 
        CASE 
            WHEN COUNT(*) > 0 THEN
                p_is_confirmed = (
                    SELECT confirmed 
                    FROM trend_validations 
                    WHERE trend_id = p_trend_id 
                    GROUP BY confirmed 
                    ORDER BY COUNT(*) DESC 
                    LIMIT 1
                )
            ELSE TRUE
        END INTO v_is_consensus
    FROM trend_validations
    WHERE trend_id = p_trend_id;
    
    -- Apply consensus bonus
    IF v_is_consensus THEN
        v_base_amount := v_base_amount + 0.005; -- 0.5 cent bonus for consensus
    END IF;
    
    -- Apply confidence bonus (up to 0.5 cents)
    v_base_amount := v_base_amount + (0.005 * p_confidence_score);
    
    -- Apply tier multiplier
    v_final_amount := v_base_amount * v_tier_multiplier;
    
    -- Cap at max validation reward
    v_final_amount := LEAST(v_final_amount, 0.05); -- 5 cents max per validation
    
    RETURN v_final_amount;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION calculate_validation_earnings IS 'Calculate validation earnings with spotter tier multiplier. Elite gets 1.5x, Verified 1.0x, Learning 0.7x, Restricted 0.3x';