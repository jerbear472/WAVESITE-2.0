-- Spotter Tier Progression System
-- Automatic tier updates based on performance metrics

-- Function to calculate user's spotter tier based on performance
CREATE OR REPLACE FUNCTION calculate_spotter_tier(
    p_user_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_approval_rate DECIMAL;
    v_total_trends_30d INTEGER;
    v_total_approved_30d INTEGER;
    v_viral_trends_count INTEGER;
    v_quality_score_avg DECIMAL;
    v_consecutive_approved INTEGER;
BEGIN
    -- Calculate 30-day approval rate
    SELECT 
        COUNT(CASE WHEN status = 'approved' THEN 1 END)::DECIMAL / NULLIF(COUNT(*), 0),
        COUNT(*),
        COUNT(CASE WHEN status = 'approved' THEN 1 END)
    INTO v_approval_rate, v_total_trends_30d, v_total_approved_30d
    FROM trends
    WHERE spotter_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Get average quality score
    SELECT AVG(quality_score)
    INTO v_quality_score_avg
    FROM trends
    WHERE spotter_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days';
    
    -- Count viral trends (simplified - trends with high engagement)
    SELECT COUNT(*)
    INTO v_viral_trends_count
    FROM trends
    WHERE spotter_id = p_user_id
    AND created_at >= NOW() - INTERVAL '30 days'
    AND (views_count > 100000 OR validation_count > 50);
    
    -- Get consecutive approved trends (streak)
    WITH ranked_trends AS (
        SELECT 
            status,
            ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM trends
        WHERE spotter_id = p_user_id
        ORDER BY created_at DESC
    )
    SELECT COUNT(*)
    INTO v_consecutive_approved
    FROM ranked_trends
    WHERE status = 'approved'
    AND rn = (
        SELECT MIN(rn)
        FROM ranked_trends t2
        WHERE t2.rn <= ranked_trends.rn
        AND t2.status != 'approved'
    ) + 1;
    
    -- Set defaults if null
    v_approval_rate := COALESCE(v_approval_rate, 0);
    v_total_trends_30d := COALESCE(v_total_trends_30d, 0);
    v_quality_score_avg := COALESCE(v_quality_score_avg, 0);
    v_consecutive_approved := COALESCE(v_consecutive_approved, 0);
    
    -- Determine tier based on requirements
    -- ELITE: 80%+ approval, 50+ trends, high quality, some viral content
    IF v_approval_rate >= 0.8 
       AND v_total_trends_30d >= 50 
       AND v_quality_score_avg >= 8
       AND v_viral_trends_count >= 2 THEN
        RETURN 'elite';
    
    -- VERIFIED: 50%+ approval, 20+ trends, decent quality
    ELSIF v_approval_rate >= 0.5 
          AND v_total_trends_30d >= 20
          AND v_quality_score_avg >= 6 THEN
        RETURN 'verified';
    
    -- RESTRICTED: Very poor performance or violations
    ELSIF v_approval_rate < 0.2 
          AND v_total_trends_30d >= 10 THEN
        RETURN 'restricted';
    
    -- LEARNING: Default for new users or those building up
    ELSE
        RETURN 'learning';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to update user's spotter tier
CREATE OR REPLACE FUNCTION update_spotter_tier(
    p_user_id UUID
)
RETURNS VOID AS $$
DECLARE
    v_current_tier TEXT;
    v_new_tier TEXT;
    v_tier_changed BOOLEAN := FALSE;
BEGIN
    -- Get current tier
    SELECT spotter_tier INTO v_current_tier
    FROM profiles
    WHERE id = p_user_id;
    
    -- Calculate new tier
    v_new_tier := calculate_spotter_tier(p_user_id);
    
    -- Check if tier changed
    IF v_current_tier IS DISTINCT FROM v_new_tier THEN
        v_tier_changed := TRUE;
        
        -- Update profile
        UPDATE profiles
        SET 
            spotter_tier = v_new_tier,
            spotter_tier_updated_at = NOW()
        WHERE id = p_user_id;
        
        -- Log tier change
        INSERT INTO spotter_tier_history (
            user_id,
            old_tier,
            new_tier,
            changed_at,
            reason
        ) VALUES (
            p_user_id,
            v_current_tier,
            v_new_tier,
            NOW(),
            CASE 
                WHEN v_new_tier = 'elite' THEN 'Promoted to Elite for exceptional performance'
                WHEN v_new_tier = 'verified' AND v_current_tier = 'learning' THEN 'Promoted to Verified for consistent quality'
                WHEN v_new_tier = 'learning' AND v_current_tier = 'verified' THEN 'Demoted to Learning due to decreased performance'
                WHEN v_new_tier = 'restricted' THEN 'Restricted due to poor performance'
                WHEN v_new_tier = 'learning' AND v_current_tier = 'restricted' THEN 'Restored to Learning tier'
                ELSE 'Tier adjusted based on performance metrics'
            END
        );
        
        -- Create notification for user
        INSERT INTO notifications (
            user_id,
            type,
            title,
            message,
            data
        ) VALUES (
            p_user_id,
            'tier_change',
            CASE 
                WHEN v_new_tier > v_current_tier THEN 'Congratulations! You''ve been promoted!'
                ELSE 'Your spotter tier has changed'
            END,
            CASE 
                WHEN v_new_tier = 'elite' THEN 'You''re now an Elite Spotter with 1.5x earnings multiplier!'
                WHEN v_new_tier = 'verified' THEN 'You''re now a Verified Spotter with 1.0x earnings multiplier!'
                WHEN v_new_tier = 'learning' THEN 'You''re in the Learning tier with 0.7x earnings multiplier. Keep improving!'
                WHEN v_new_tier = 'restricted' THEN 'Your account is restricted (0.3x multiplier). Improve your trend quality to restore your tier.'
            END,
            jsonb_build_object(
                'old_tier', v_current_tier,
                'new_tier', v_new_tier,
                'multiplier', get_spotter_tier_multiplier(v_new_tier)
            )
        );
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create tier history table
CREATE TABLE IF NOT EXISTS spotter_tier_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    old_tier TEXT,
    new_tier TEXT,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reason TEXT,
    metrics JSONB
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_tier_history_user_id ON spotter_tier_history(user_id);
CREATE INDEX IF NOT EXISTS idx_tier_history_changed_at ON spotter_tier_history(changed_at DESC);

-- Trigger to automatically update tier after trend submission
CREATE OR REPLACE FUNCTION check_tier_after_trend()
RETURNS TRIGGER AS $$
BEGIN
    -- Only check every 5th submission to avoid excessive calculations
    IF (
        SELECT COUNT(*) 
        FROM trends 
        WHERE spotter_id = NEW.spotter_id 
        AND created_at >= NOW() - INTERVAL '1 day'
    ) % 5 = 0 THEN
        PERFORM update_spotter_tier(NEW.spotter_id);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_tier_after_trend ON trends;
CREATE TRIGGER update_tier_after_trend
AFTER INSERT OR UPDATE OF status ON trends
FOR EACH ROW
EXECUTE FUNCTION check_tier_after_trend();

-- Function to batch update all user tiers (for scheduled jobs)
CREATE OR REPLACE FUNCTION update_all_spotter_tiers()
RETURNS TABLE(users_updated INTEGER, tiers_changed INTEGER) AS $$
DECLARE
    v_users_updated INTEGER := 0;
    v_tiers_changed INTEGER := 0;
    v_user RECORD;
    v_old_tier TEXT;
    v_new_tier TEXT;
BEGIN
    -- Update tiers for all active users
    FOR v_user IN 
        SELECT DISTINCT p.id, p.spotter_tier
        FROM profiles p
        INNER JOIN trends t ON t.spotter_id = p.id
        WHERE t.created_at >= NOW() - INTERVAL '30 days'
    LOOP
        v_old_tier := v_user.spotter_tier;
        
        -- Update tier
        PERFORM update_spotter_tier(v_user.id);
        
        -- Check if tier changed
        SELECT spotter_tier INTO v_new_tier
        FROM profiles
        WHERE id = v_user.id;
        
        v_users_updated := v_users_updated + 1;
        
        IF v_old_tier IS DISTINCT FROM v_new_tier THEN
            v_tiers_changed := v_tiers_changed + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT v_users_updated, v_tiers_changed;
END;
$$ LANGUAGE plpgsql;

-- Schedule periodic tier updates (requires pg_cron extension)
-- This would run daily at 2 AM to update all user tiers
-- SELECT cron.schedule('update-spotter-tiers', '0 2 * * *', 'SELECT update_all_spotter_tiers();');

-- Initialize tiers for existing users
DO $$
DECLARE
    v_user RECORD;
BEGIN
    FOR v_user IN SELECT id FROM profiles WHERE spotter_tier IS NULL
    LOOP
        PERFORM update_spotter_tier(v_user.id);
    END LOOP;
END $$;

-- Add comments for documentation
COMMENT ON FUNCTION calculate_spotter_tier IS 'Calculates appropriate spotter tier based on 30-day performance metrics';
COMMENT ON FUNCTION update_spotter_tier IS 'Updates user spotter tier and logs changes';
COMMENT ON TABLE spotter_tier_history IS 'Tracks all spotter tier changes for users';