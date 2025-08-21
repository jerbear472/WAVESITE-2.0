-- Migration: Convert from earnings to XP system
-- This migration adds XP columns alongside existing earnings columns for backwards compatibility

-- 1. Add XP columns to scroll_sessions table
ALTER TABLE scroll_sessions 
ADD COLUMN IF NOT EXISTS xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_bonus INTEGER DEFAULT 0;

-- 2. Add XP tracking to trend_submissions
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS xp_reward INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_status TEXT DEFAULT 'pending'; -- pending, awarded, cancelled

-- 3. Create XP events table for detailed tracking
CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    xp_change INTEGER NOT NULL, -- Can be negative for penalties
    event_type TEXT NOT NULL, -- trend_submitted, trend_approved, trend_rejected, validation_vote, achievement, etc.
    event_id UUID, -- Reference to the event (trend_id, validation_id, etc.)
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create XP ledger for user totals
CREATE TABLE IF NOT EXISTS xp_ledger (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    level_title TEXT DEFAULT 'Observer',
    lifetime_xp INTEGER DEFAULT 0,
    daily_xp INTEGER DEFAULT 0,
    daily_xp_date DATE DEFAULT CURRENT_DATE,
    last_updated TIMESTAMPTZ DEFAULT now()
);

-- 5. Create achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_key TEXT NOT NULL,
    achievement_name TEXT NOT NULL,
    xp_reward INTEGER NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB,
    UNIQUE(user_id, achievement_key)
);

-- 6. Add XP fields to user_profiles if not exists
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS level_title TEXT DEFAULT 'Observer';

-- 7. Create function to update user XP
CREATE OR REPLACE FUNCTION update_user_xp(
    p_user_id UUID,
    p_xp_change INTEGER,
    p_event_type TEXT,
    p_event_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
    v_new_level INTEGER;
    v_level_title TEXT;
BEGIN
    -- Insert XP event
    INSERT INTO xp_events (user_id, xp_change, event_type, event_id, metadata)
    VALUES (p_user_id, p_xp_change, p_event_type, p_event_id, p_metadata);
    
    -- Update or insert into XP ledger
    INSERT INTO xp_ledger (user_id, total_xp, lifetime_xp, daily_xp, daily_xp_date)
    VALUES (p_user_id, GREATEST(0, p_xp_change), GREATEST(0, p_xp_change), 
            CASE WHEN p_xp_change > 0 THEN p_xp_change ELSE 0 END, CURRENT_DATE)
    ON CONFLICT (user_id) DO UPDATE SET
        total_xp = GREATEST(0, xp_ledger.total_xp + p_xp_change),
        lifetime_xp = xp_ledger.lifetime_xp + CASE WHEN p_xp_change > 0 THEN p_xp_change ELSE 0 END,
        daily_xp = CASE 
            WHEN xp_ledger.daily_xp_date = CURRENT_DATE 
            THEN xp_ledger.daily_xp + CASE WHEN p_xp_change > 0 THEN p_xp_change ELSE 0 END
            ELSE CASE WHEN p_xp_change > 0 THEN p_xp_change ELSE 0 END
        END,
        daily_xp_date = CURRENT_DATE,
        last_updated = now()
    RETURNING total_xp INTO v_new_total;
    
    -- Calculate new level based on total XP
    v_new_level := CASE
        WHEN v_new_total >= 12500 THEN 15  -- Legend
        WHEN v_new_total >= 10000 THEN 14  -- Master
        WHEN v_new_total >= 8000 THEN 13   -- Visionary
        WHEN v_new_total >= 6600 THEN 12   -- Pioneer
        WHEN v_new_total >= 5500 THEN 11   -- Authority
        WHEN v_new_total >= 4500 THEN 10   -- Researcher
        WHEN v_new_total >= 3600 THEN 9    -- Scholar
        WHEN v_new_total >= 2800 THEN 8    -- Expert
        WHEN v_new_total >= 2100 THEN 7    -- Specialist
        WHEN v_new_total >= 1500 THEN 6    -- Interpreter
        WHEN v_new_total >= 1000 THEN 5    -- Analyst
        WHEN v_new_total >= 600 THEN 4     -- Spotter
        WHEN v_new_total >= 300 THEN 3     -- Tracker
        WHEN v_new_total >= 100 THEN 2     -- Recorder
        ELSE 1                              -- Observer
    END;
    
    -- Get level title
    v_level_title := CASE v_new_level
        WHEN 15 THEN 'Legend'
        WHEN 14 THEN 'Master'
        WHEN 13 THEN 'Visionary'
        WHEN 12 THEN 'Pioneer'
        WHEN 11 THEN 'Authority'
        WHEN 10 THEN 'Researcher'
        WHEN 9 THEN 'Scholar'
        WHEN 8 THEN 'Expert'
        WHEN 7 THEN 'Specialist'
        WHEN 6 THEN 'Interpreter'
        WHEN 5 THEN 'Analyst'
        WHEN 4 THEN 'Spotter'
        WHEN 3 THEN 'Tracker'
        WHEN 2 THEN 'Recorder'
        ELSE 'Observer'
    END;
    
    -- Update level in ledger
    UPDATE xp_ledger 
    SET current_level = v_new_level, level_title = v_level_title
    WHERE user_id = p_user_id;
    
    -- Update user_profiles
    UPDATE user_profiles
    SET total_xp = v_new_total, 
        current_level = v_new_level,
        level_title = v_level_title
    WHERE user_id = p_user_id;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for trend approval/rejection XP
CREATE OR REPLACE FUNCTION handle_trend_validation_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award XP when trend is approved
    IF NEW.validation_state = 'validated' AND OLD.validation_state != 'validated' THEN
        PERFORM update_user_xp(
            NEW.spotter_id,
            50, -- Approval bonus XP
            'trend_approved',
            NEW.id,
            jsonb_build_object('trend_id', NEW.id, 'title', NEW.title)
        );
        
        -- Update trend XP status
        UPDATE trend_submissions 
        SET xp_reward = 50, xp_status = 'awarded'
        WHERE id = NEW.id;
        
    -- Deduct XP when trend is rejected
    ELSIF NEW.validation_state = 'rejected' AND OLD.validation_state != 'rejected' THEN
        PERFORM update_user_xp(
            NEW.spotter_id,
            -10, -- Rejection penalty
            'trend_rejected',
            NEW.id,
            jsonb_build_object('trend_id', NEW.id, 'title', NEW.title)
        );
        
        -- Update trend XP status
        UPDATE trend_submissions 
        SET xp_reward = -10, xp_status = 'cancelled'
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trend_validation_xp_trigger ON trend_submissions;
CREATE TRIGGER trend_validation_xp_trigger
    AFTER UPDATE OF validation_state ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_validation_xp();

-- 9. Create RLS policies for new tables
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Users can see their own XP events
CREATE POLICY "Users can view own XP events" ON xp_events
    FOR SELECT USING (auth.uid() = user_id);

-- Users can see their own XP ledger
CREATE POLICY "Users can view own XP ledger" ON xp_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- Users can see their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all XP data
CREATE POLICY "Service role can manage XP events" ON xp_events
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage XP ledger" ON xp_ledger
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage achievements" ON user_achievements
    FOR ALL USING (auth.role() = 'service_role');

-- 10. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_xp_events_event_type ON xp_events(event_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);

-- 11. Initialize XP ledger for existing users
INSERT INTO xp_ledger (user_id, total_xp, current_level, level_title)
SELECT 
    id as user_id,
    COALESCE((SELECT SUM(xp_change) FROM xp_events WHERE user_id = auth.users.id), 0) as total_xp,
    1 as current_level,
    'Observer' as level_title
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;