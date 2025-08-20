-- =============================================
-- XP SYSTEM MIGRATION FOR YOUR EXACT SCHEMA
-- Tailored for your specific database structure
-- =============================================

-- Step 1: Create XP core tables
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

CREATE TABLE IF NOT EXISTS public.xp_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    reference_id UUID,
    reference_type TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.xp_levels (
    level INTEGER PRIMARY KEY,
    required_xp INTEGER NOT NULL,
    title TEXT NOT NULL,
    perks JSONB DEFAULT '[]',
    badge_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    xp_reward INTEGER DEFAULT 0,
    icon_url TEXT,
    category TEXT,
    requirements JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Step 2: Add XP settings to user_profiles table
ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS display_level BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_achievements BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS favorite_achievement_id UUID REFERENCES achievements(id),
    ADD COLUMN IF NOT EXISTS xp_migrated BOOLEAN DEFAULT false;

-- Step 3: Add XP tracking to trend_submissions
ALTER TABLE trend_submissions
    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 1.0;

-- Step 4: Insert XP levels (15 levels)
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

-- Step 5: Insert achievements
INSERT INTO achievements (name, description, xp_reward, category, requirements) VALUES
-- Submission achievements
('First Trend', 'Submit your first trend', 50, 'submission', '{"trends_submitted": 1}'),
('Trend Spotter', 'Submit 10 trends', 100, 'submission', '{"trends_submitted": 10}'),
('Trend Hunter', 'Submit 50 trends', 250, 'submission', '{"trends_submitted": 50}'),
('Trend Master', 'Submit 100 trends', 500, 'submission', '{"trends_submitted": 100}'),
-- Validation achievements
('First Validation', 'Complete your first validation', 25, 'validation', '{"validations_completed": 1}'),
('Validator', 'Complete 10 validations', 75, 'validation', '{"validations_completed": 10}'),
('Quality Controller', 'Complete 50 validations', 200, 'validation', '{"validations_completed": 50}'),
('Validation Expert', 'Complete 100 validations', 300, 'validation', '{"validations_completed": 100}'),
-- Streak achievements
('Three Day Streak', '3-day submission streak', 100, 'streak', '{"daily_streak": 3}'),
('Week Warrior', '7-day submission streak', 200, 'streak', '{"daily_streak": 7}'),
('Fortnight Fighter', '14-day submission streak', 400, 'streak', '{"daily_streak": 14}'),
('Month Master', '30-day submission streak', 1000, 'streak', '{"daily_streak": 30}'),
-- Legacy achievements for existing users
('Early Adopter', 'Joined before XP system', 500, 'legacy', '{"legacy_user": true}'),
('Beta Tester', 'Active during beta phase', 300, 'legacy', '{"beta_user": true}'),
('Founding Member', 'One of the first 100 users', 1000, 'legacy', '{"founding_member": true}')
ON CONFLICT (name) DO NOTHING;

-- Step 6: Create XP award function
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
    INSERT INTO xp_transactions (user_id, amount, type, description, reference_id, reference_type)
    VALUES (p_user_id, p_amount, p_type, p_description, p_reference_id, p_reference_type);
    
    -- Update or insert user's total XP
    INSERT INTO user_xp (user_id, total_xp)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;
    
    -- Get old level
    SELECT current_level INTO v_old_level FROM user_xp WHERE user_id = p_user_id;
    
    -- Calculate new level
    SELECT MAX(level) INTO v_new_level
    FROM xp_levels 
    WHERE required_xp <= v_new_total;
    
    -- Update level and XP to next level
    UPDATE user_xp 
    SET current_level = COALESCE(v_new_level, 1),
        xp_to_next_level = (
            SELECT MIN(required_xp) - v_new_total 
            FROM xp_levels 
            WHERE required_xp > v_new_total
        )
    WHERE user_id = p_user_id;
    
    -- If leveled up, could trigger additional rewards here
    IF v_new_level > v_old_level THEN
        INSERT INTO xp_transactions (user_id, amount, type, description)
        VALUES (p_user_id, 0, 'level_up', 'Reached level ' || v_new_level);
    END IF;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for trend submission XP
CREATE OR REPLACE FUNCTION award_trend_submission_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 25 XP for new trend submissions
    PERFORM award_xp(
        NEW.spotter_id, 
        25, 
        'trend_submission', 
        'Submitted a new trend',
        NEW.id,
        'trend'
    );
    
    -- Update the trend with XP awarded
    UPDATE trend_submissions 
    SET xp_awarded = 25 
    WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_trend_xp') THEN
        CREATE TRIGGER trigger_award_trend_xp
        AFTER INSERT ON trend_submissions
        FOR EACH ROW
        EXECUTE FUNCTION award_trend_submission_xp();
    END IF;
END $$;

-- Step 8: Create trigger for validation XP (using trend_validations table)
CREATE OR REPLACE FUNCTION award_validation_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 5 XP for validations
    PERFORM award_xp(
        NEW.validator_id, 
        5, 
        'validation_vote', 
        'Completed a validation',
        NEW.id,
        'validation'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_validation_xp') THEN
        CREATE TRIGGER trigger_award_validation_xp
        AFTER INSERT ON trend_validations
        FOR EACH ROW
        EXECUTE FUNCTION award_validation_xp();
    END IF;
END $$;

-- Step 9: Create leaderboard views
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

-- Step 10: Enable RLS on new tables
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Step 11: Create RLS policies
CREATE POLICY "Anyone can view XP scores" ON user_xp
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view achievements list" ON achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Step 12: Migrate existing users to XP system
DO $$
DECLARE
    v_user RECORD;
    v_trends_count INTEGER;
    v_validations_count INTEGER;
    v_bonus_xp INTEGER;
    v_user_number INTEGER := 0;
BEGIN
    -- Loop through all existing users
    FOR v_user IN SELECT id FROM auth.users LOOP
        v_user_number := v_user_number + 1;
        
        -- Count their trends
        SELECT COUNT(*) INTO v_trends_count 
        FROM trend_submissions 
        WHERE spotter_id = v_user.id;
        
        -- Count their validations
        SELECT COUNT(*) INTO v_validations_count 
        FROM trend_validations 
        WHERE validator_id = v_user.id;
        
        -- Calculate bonus XP
        -- Base: 100 XP welcome bonus
        -- + 10 XP per trend submitted
        -- + 5 XP per validation done
        v_bonus_xp := 100 + (COALESCE(v_trends_count, 0) * 10) + (COALESCE(v_validations_count, 0) * 5);
        
        -- Award the migration bonus XP
        PERFORM award_xp(
            v_user.id, 
            v_bonus_xp, 
            'migration_bonus', 
            format('Welcome bonus: %s trends, %s validations', v_trends_count, v_validations_count)
        );
        
        -- Mark user as migrated
        UPDATE user_profiles 
        SET xp_migrated = true 
        WHERE user_id = v_user.id;
        
        -- Award Early Adopter achievement to all existing users
        INSERT INTO user_achievements (user_id, achievement_id)
        SELECT v_user.id, id FROM achievements WHERE name = 'Early Adopter'
        ON CONFLICT DO NOTHING;
        
        -- Award Founding Member to first 100 users
        IF v_user_number <= 100 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Founding Member'
            ON CONFLICT DO NOTHING;
        END IF;
        
        -- Award achievements based on activity
        IF v_trends_count >= 1 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'First Trend'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_trends_count >= 10 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Trend Spotter'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_trends_count >= 50 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Trend Hunter'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_trends_count >= 100 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Trend Master'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_validations_count >= 1 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'First Validation'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_validations_count >= 10 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Validator'
            ON CONFLICT DO NOTHING;
        END IF;
        
        IF v_validations_count >= 50 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Quality Controller'
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed for % users', v_user_number;
END $$;

-- Step 13: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_xp_user_id ON user_xp(user_id);
CREATE INDEX IF NOT EXISTS idx_user_xp_level ON user_xp(current_level);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user_id ON xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_created ON xp_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_xp ON trend_submissions(xp_awarded) WHERE xp_awarded > 0;

-- Step 14: Verify the migration and show summary
WITH migration_stats AS (
    SELECT 
        (SELECT COUNT(*) FROM auth.users) as total_users,
        (SELECT COUNT(*) FROM user_xp) as users_with_xp,
        (SELECT COUNT(*) FROM xp_transactions) as total_transactions,
        (SELECT COUNT(*) FROM achievements) as total_achievements,
        (SELECT COUNT(*) FROM user_achievements) as achievements_earned,
        (SELECT COALESCE(AVG(total_xp), 0)::INTEGER FROM user_xp) as avg_xp,
        (SELECT COALESCE(MAX(total_xp), 0) FROM user_xp) as max_xp,
        (SELECT COALESCE(MIN(total_xp), 0) FROM user_xp WHERE total_xp > 0) as min_xp
)
SELECT 
    '✅ XP System Successfully Installed!' as status,
    total_users || ' users' as users,
    users_with_xp || ' have XP' as migrated,
    avg_xp || ' avg XP' as average,
    min_xp || '-' || max_xp || ' XP range' as xp_range,
    total_achievements || ' achievements' as achievements,
    achievements_earned || ' earned' as earned
FROM migration_stats;

-- Show top 10 users by XP
SELECT 
    '🏆 Top 10 Users by XP' as leaderboard,
    global_rank as rank,
    username,
    total_xp as xp,
    level_title as level,
    achievement_count as achievements
FROM xp_leaderboard
LIMIT 10;