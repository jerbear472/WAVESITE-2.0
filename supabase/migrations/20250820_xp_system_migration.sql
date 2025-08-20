-- =============================================
-- XP SYSTEM MIGRATION
-- Replacing earnings/monetization with XP system
-- =============================================

-- 1. Create XP tables
-- =============================================

-- User XP tracking table
CREATE TABLE IF NOT EXISTS public.user_xp (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    xp_to_next_level INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- XP transactions ledger (replaces earnings_ledger)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN (
        'trend_submission',
        'validation_vote',
        'trend_approved',
        'daily_bonus',
        'streak_bonus',
        'achievement',
        'level_up_bonus',
        'community_contribution',
        'quality_bonus'
    )),
    description TEXT,
    reference_id UUID, -- Can reference trend_id, validation_id, etc.
    reference_type TEXT, -- 'trend', 'validation', 'achievement', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP levels configuration
CREATE TABLE IF NOT EXISTS public.xp_levels (
    level INTEGER PRIMARY KEY,
    required_xp INTEGER NOT NULL,
    title TEXT NOT NULL,
    perks JSONB DEFAULT '[]',
    badge_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Achievements system
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    xp_reward INTEGER DEFAULT 0,
    icon_url TEXT,
    category TEXT CHECK (category IN ('submission', 'validation', 'streak', 'community', 'special')),
    requirements JSONB NOT NULL, -- Flexible requirements definition
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User achievements tracking
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- 2. Insert default XP levels
-- =============================================
INSERT INTO xp_levels (level, required_xp, title, perks) VALUES
(1, 0, 'Newcomer', '["Basic trend submission"]'),
(2, 100, 'Scout', '["Validation access"]'),
(3, 300, 'Explorer', '["Profile badges"]'),
(4, 600, 'Tracker', '["Custom avatar frame"]'),
(5, 1000, 'Hunter', '["Priority validation queue"]'),
(6, 1500, 'Analyst', '["Trend insights access"]'),
(7, 2200, 'Expert', '["Community moderator tools"]'),
(8, 3000, 'Master', '["Elite badge", "2x XP multiplier"]'),
(9, 4000, 'Guru', '["Custom title"]'),
(10, 5200, 'Legend', '["Hall of fame", "3x XP multiplier"]'),
(11, 6600, 'Mythic', '["Exclusive content access"]'),
(12, 8200, 'Titan', '["Community leader privileges"]'),
(13, 10000, 'Oracle', '["Special recognition"]'),
(14, 12000, 'Sage', '["Mentor status"]'),
(15, 14500, 'Visionary', '["Platform influencer"]')
ON CONFLICT (level) DO NOTHING;

-- 3. Insert default achievements
-- =============================================
INSERT INTO achievements (name, description, xp_reward, category, requirements) VALUES
('First Trend', 'Submit your first trend', 50, 'submission', '{"trends_submitted": 1}'),
('Trend Spotter', 'Submit 10 trends', 100, 'submission', '{"trends_submitted": 10}'),
('Trend Master', 'Submit 100 trends', 500, 'submission', '{"trends_submitted": 100}'),
('Validator', 'Complete 10 validations', 75, 'validation', '{"validations_completed": 10}'),
('Quality Control', 'Complete 100 validations', 300, 'validation', '{"validations_completed": 100}'),
('Week Warrior', '7-day submission streak', 200, 'streak', '{"daily_streak": 7}'),
('Month Master', '30-day submission streak', 1000, 'streak', '{"daily_streak": 30}'),
('Community Helper', 'Help 50 users', 250, 'community', '{"users_helped": 50}'),
('Viral Trend', 'Submit a trend that goes viral', 500, 'special', '{"viral_trends": 1}')
ON CONFLICT (name) DO NOTHING;

-- 4. Update profiles table to remove earnings-related columns
-- =============================================
ALTER TABLE profiles 
    DROP COLUMN IF EXISTS earnings_balance CASCADE,
    DROP COLUMN IF EXISTS total_earnings CASCADE,
    DROP COLUMN IF EXISTS pending_earnings CASCADE,
    DROP COLUMN IF EXISTS cashout_requested CASCADE,
    DROP COLUMN IF EXISTS stripe_account_id CASCADE,
    DROP COLUMN IF EXISTS payment_method CASCADE;

-- Add XP-related columns
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS display_level BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_achievements BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS favorite_achievement_id UUID REFERENCES achievements(id);

-- 5. Update trend_submissions table
-- =============================================
ALTER TABLE trend_submissions
    DROP COLUMN IF EXISTS earning_amount CASCADE,
    DROP COLUMN IF EXISTS payout_status CASCADE,
    DROP COLUMN IF EXISTS payout_date CASCADE,
    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 1.0;

-- 6. XP calculation configuration
-- =============================================
CREATE TABLE IF NOT EXISTS public.xp_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO xp_config (key, value) VALUES
('base_rates', '{
    "trend_submission": 25,
    "validation_vote": 5,
    "trend_approved": 50,
    "daily_login": 10,
    "perfect_validation": 15
}'),
('multipliers', '{
    "tier_multipliers": {
        "beginner": 1.0,
        "intermediate": 1.5,
        "advanced": 2.0,
        "expert": 3.0
    },
    "streak_multipliers": {
        "3_days": 1.2,
        "7_days": 1.5,
        "14_days": 2.0,
        "30_days": 3.0
    },
    "quality_multipliers": {
        "low": 0.5,
        "medium": 1.0,
        "high": 1.5,
        "exceptional": 2.0
    }
}'),
('level_requirements', '{
    "xp_per_level": 100,
    "scaling_factor": 1.2
}')
ON CONFLICT (key) DO NOTHING;

-- 7. Create functions for XP system
-- =============================================

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION calculate_user_level(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
    current_level INTEGER;
BEGIN
    SELECT COALESCE(MAX(level), 1) INTO current_level
    FROM xp_levels
    WHERE required_xp <= total_xp;
    
    RETURN current_level;
END;
$$ LANGUAGE plpgsql;

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
    v_old_level INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Insert XP transaction
    INSERT INTO xp_transactions (
        user_id, amount, type, description, 
        reference_id, reference_type
    ) VALUES (
        p_user_id, p_amount, p_type, p_description,
        p_reference_id, p_reference_type
    );
    
    -- Update user's total XP
    INSERT INTO user_xp (user_id, total_xp)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;
    
    -- Check for level up
    SELECT current_level INTO v_old_level FROM user_xp WHERE user_id = p_user_id;
    v_new_level := calculate_user_level(v_new_total);
    
    IF v_new_level > v_old_level THEN
        -- Update level
        UPDATE user_xp 
        SET current_level = v_new_level,
            xp_to_next_level = (SELECT required_xp FROM xp_levels WHERE level = v_new_level + 1) - v_new_total
        WHERE user_id = p_user_id;
        
        -- Award level up bonus XP
        PERFORM award_xp(
            p_user_id, 
            v_new_level * 10, 
            'level_up_bonus',
            'Congratulations on reaching level ' || v_new_level || '!'
        );
    END IF;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Function to check and award achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    v_achievement RECORD;
    v_stats JSONB;
    v_qualified BOOLEAN;
BEGIN
    -- Get user stats
    SELECT jsonb_build_object(
        'trends_submitted', COUNT(*) FILTER (WHERE type = 'trend_submission'),
        'validations_completed', COUNT(*) FILTER (WHERE type = 'validation_vote'),
        'total_xp', COALESCE(SUM(amount), 0)
    ) INTO v_stats
    FROM xp_transactions
    WHERE user_id = p_user_id;
    
    -- Check each achievement
    FOR v_achievement IN 
        SELECT a.* FROM achievements a
        LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = p_user_id
        WHERE ua.id IS NULL
    LOOP
        v_qualified := TRUE;
        
        -- Check requirements (simplified - you'd expand this logic)
        IF v_achievement.requirements ? 'trends_submitted' THEN
            v_qualified := v_qualified AND 
                (v_stats->>'trends_submitted')::INTEGER >= 
                (v_achievement.requirements->>'trends_submitted')::INTEGER;
        END IF;
        
        IF v_achievement.requirements ? 'validations_completed' THEN
            v_qualified := v_qualified AND 
                (v_stats->>'validations_completed')::INTEGER >= 
                (v_achievement.requirements->>'validations_completed')::INTEGER;
        END IF;
        
        -- Award achievement if qualified
        IF v_qualified THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            VALUES (p_user_id, v_achievement.id);
            
            -- Award achievement XP
            PERFORM award_xp(
                p_user_id,
                v_achievement.xp_reward,
                'achievement',
                'Achievement unlocked: ' || v_achievement.name,
                v_achievement.id,
                'achievement'
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers for XP awards
-- =============================================

-- Trigger for trend submission XP
CREATE OR REPLACE FUNCTION award_trend_submission_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_base_xp INTEGER;
    v_multiplier DECIMAL;
BEGIN
    -- Get base XP for trend submission
    SELECT (value->>'trend_submission')::INTEGER INTO v_base_xp
    FROM xp_config WHERE key = 'base_rates';
    
    -- Calculate multipliers based on user tier, streaks, etc.
    v_multiplier := 1.0; -- You can add complex multiplier logic here
    
    -- Award XP
    PERFORM award_xp(
        NEW.spotter_id,
        ROUND(v_base_xp * v_multiplier),
        'trend_submission',
        'Trend submitted',
        NEW.id,
        'trend'
    );
    
    -- Check for achievements
    PERFORM check_achievements(NEW.spotter_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_trend_xp
AFTER INSERT ON trend_submissions
FOR EACH ROW
EXECUTE FUNCTION award_trend_submission_xp();

-- Trigger for validation XP
CREATE OR REPLACE FUNCTION award_validation_xp()
RETURNS TRIGGER AS $$
DECLARE
    v_base_xp INTEGER;
BEGIN
    -- Get base XP for validation
    SELECT (value->>'validation_vote')::INTEGER INTO v_base_xp
    FROM xp_config WHERE key = 'base_rates';
    
    -- Award XP
    PERFORM award_xp(
        NEW.validator_id,
        v_base_xp,
        'validation_vote',
        'Validation completed',
        NEW.id,
        'validation'
    );
    
    -- Check for achievements
    PERFORM check_achievements(NEW.validator_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_award_validation_xp
AFTER INSERT ON validations
FOR EACH ROW
EXECUTE FUNCTION award_validation_xp();

-- 9. Create views for leaderboards
-- =============================================

CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT 
    u.user_id,
    p.username,
    p.avatar_url,
    u.total_xp,
    u.current_level,
    l.title as level_title,
    COUNT(DISTINCT ua.achievement_id) as achievement_count,
    RANK() OVER (ORDER BY u.total_xp DESC) as global_rank
FROM user_xp u
JOIN profiles p ON u.user_id = p.id
LEFT JOIN xp_levels l ON u.current_level = l.level
LEFT JOIN user_achievements ua ON u.user_id = ua.user_id
GROUP BY u.user_id, p.username, p.avatar_url, u.total_xp, u.current_level, l.title;

-- Weekly leaderboard
CREATE OR REPLACE VIEW weekly_xp_leaderboard AS
SELECT 
    xt.user_id,
    p.username,
    p.avatar_url,
    SUM(xt.amount) as weekly_xp,
    RANK() OVER (ORDER BY SUM(xt.amount) DESC) as weekly_rank
FROM xp_transactions xt
JOIN profiles p ON xt.user_id = p.id
WHERE xt.created_at >= NOW() - INTERVAL '7 days'
GROUP BY xt.user_id, p.username, p.avatar_url;

-- 10. Drop old earnings/payment tables (commented out for safety)
-- =============================================
-- Uncomment these when ready to fully remove the old system
-- DROP TABLE IF EXISTS earnings_ledger CASCADE;
-- DROP TABLE IF EXISTS payments CASCADE;
-- DROP TABLE IF EXISTS payment_tiers CASCADE;
-- DROP TABLE IF EXISTS bounty_submissions CASCADE;
-- DROP TABLE IF EXISTS stripe_webhooks CASCADE;

-- 11. Create indexes for performance
-- =============================================
CREATE INDEX idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX idx_xp_transactions_created_at ON xp_transactions(created_at DESC);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);

-- 12. Enable RLS for new tables
-- =============================================
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own XP" ON user_xp
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all achievements" ON achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Public leaderboard access
CREATE POLICY "Anyone can view XP leaderboard" ON user_xp
    FOR SELECT USING (true);