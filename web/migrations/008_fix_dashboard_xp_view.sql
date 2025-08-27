-- Fix user_xp_summary view to include all fields needed by dashboard
DROP VIEW IF EXISTS user_xp_summary CASCADE;

CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(x.total_xp, 0) as total_xp,
    COALESCE(x.current_level, 1) as level,  -- Changed from current_level to level
    COALESCE(x.xp_to_next_level, 100) as xp_to_next_level,
    
    -- Add level title calculation
    CASE 
        WHEN COALESCE(x.current_level, 1) >= 15 THEN 'Legend'
        WHEN COALESCE(x.current_level, 1) >= 14 THEN 'Master'
        WHEN COALESCE(x.current_level, 1) >= 13 THEN 'Visionary'
        WHEN COALESCE(x.current_level, 1) >= 12 THEN 'Pioneer'
        WHEN COALESCE(x.current_level, 1) >= 11 THEN 'Authority'
        WHEN COALESCE(x.current_level, 1) >= 10 THEN 'Researcher'
        WHEN COALESCE(x.current_level, 1) >= 9 THEN 'Scholar'
        WHEN COALESCE(x.current_level, 1) >= 8 THEN 'Expert'
        WHEN COALESCE(x.current_level, 1) >= 7 THEN 'Specialist'
        WHEN COALESCE(x.current_level, 1) >= 6 THEN 'Interpreter'
        WHEN COALESCE(x.current_level, 1) >= 5 THEN 'Analyst'
        WHEN COALESCE(x.current_level, 1) >= 4 THEN 'Spotter'
        WHEN COALESCE(x.current_level, 1) >= 3 THEN 'Tracker'
        WHEN COALESCE(x.current_level, 1) >= 2 THEN 'Recorder'
        ELSE 'Observer'
    END as level_title,
    
    -- Trend submission counts
    COALESCE(trend_stats.total_trends_submitted, 0) as total_trends_submitted,
    COALESCE(trend_stats.validated_trends, 0) as validated_trends,
    COALESCE(trend_stats.rejected_trends, 0) as rejected_trends,
    COALESCE(trend_stats.pending_trends, 0) as pending_trends
    
FROM 
    profiles u
    LEFT JOIN user_xp x ON u.id = x.user_id
    LEFT JOIN (
        SELECT 
            spotter_id,
            COUNT(*) as total_trends_submitted,
            COUNT(CASE WHEN status = 'validated' OR status = 'approved' THEN 1 END) as validated_trends,
            COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_trends,
            COUNT(CASE WHEN status = 'submitted' OR status = 'pending' THEN 1 END) as pending_trends
        FROM trend_submissions 
        GROUP BY spotter_id
    ) trend_stats ON u.id = trend_stats.spotter_id;

-- Grant access to the view
GRANT SELECT ON user_xp_summary TO authenticated;

-- Also ensure user_xp table has proper level calculation trigger
CREATE OR REPLACE FUNCTION calculate_user_level(xp INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- XP thresholds: 0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500, 5500, 6600, 8000, 10000, 12500
    IF xp >= 12500 THEN RETURN 15;
    ELSIF xp >= 10000 THEN RETURN 14;
    ELSIF xp >= 8000 THEN RETURN 13;
    ELSIF xp >= 6600 THEN RETURN 12;
    ELSIF xp >= 5500 THEN RETURN 11;
    ELSIF xp >= 4500 THEN RETURN 10;
    ELSIF xp >= 3600 THEN RETURN 9;
    ELSIF xp >= 2800 THEN RETURN 8;
    ELSIF xp >= 2100 THEN RETURN 7;
    ELSIF xp >= 1500 THEN RETURN 6;
    ELSIF xp >= 1000 THEN RETURN 5;
    ELSIF xp >= 600 THEN RETURN 4;
    ELSIF xp >= 300 THEN RETURN 3;
    ELSIF xp >= 100 THEN RETURN 2;
    ELSE RETURN 1;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update level when XP changes
CREATE OR REPLACE FUNCTION update_user_level()
RETURNS TRIGGER AS $$
BEGIN
    NEW.current_level := calculate_user_level(NEW.total_xp);
    
    -- Calculate XP to next level
    CASE NEW.current_level
        WHEN 1 THEN NEW.xp_to_next_level := 100 - NEW.total_xp;
        WHEN 2 THEN NEW.xp_to_next_level := 300 - NEW.total_xp;
        WHEN 3 THEN NEW.xp_to_next_level := 600 - NEW.total_xp;
        WHEN 4 THEN NEW.xp_to_next_level := 1000 - NEW.total_xp;
        WHEN 5 THEN NEW.xp_to_next_level := 1500 - NEW.total_xp;
        WHEN 6 THEN NEW.xp_to_next_level := 2100 - NEW.total_xp;
        WHEN 7 THEN NEW.xp_to_next_level := 2800 - NEW.total_xp;
        WHEN 8 THEN NEW.xp_to_next_level := 3600 - NEW.total_xp;
        WHEN 9 THEN NEW.xp_to_next_level := 4500 - NEW.total_xp;
        WHEN 10 THEN NEW.xp_to_next_level := 5500 - NEW.total_xp;
        WHEN 11 THEN NEW.xp_to_next_level := 6600 - NEW.total_xp;
        WHEN 12 THEN NEW.xp_to_next_level := 8000 - NEW.total_xp;
        WHEN 13 THEN NEW.xp_to_next_level := 10000 - NEW.total_xp;
        WHEN 14 THEN NEW.xp_to_next_level := 12500 - NEW.total_xp;
        ELSE NEW.xp_to_next_level := 0; -- Max level reached
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_user_level_trigger ON user_xp;

-- Create trigger
CREATE TRIGGER update_user_level_trigger
    BEFORE INSERT OR UPDATE OF total_xp ON user_xp
    FOR EACH ROW
    EXECUTE FUNCTION update_user_level();

-- Update existing records
UPDATE user_xp SET current_level = calculate_user_level(total_xp);