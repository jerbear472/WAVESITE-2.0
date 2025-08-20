-- =============================================
-- XP SYSTEM MIGRATION (FIXED FOR VIEWS)
-- Copy and paste this into Supabase SQL Editor
-- =============================================

-- Step 1: Create XP tables (these are new, won't conflict)
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

-- Step 2: Create a separate table for XP-related profile settings
CREATE TABLE IF NOT EXISTS public.user_xp_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_level BOOLEAN DEFAULT true,
    display_achievements BOOLEAN DEFAULT true,
    favorite_achievement_id UUID REFERENCES achievements(id),
    xp_migrated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Insert XP levels
INSERT INTO xp_levels (level, required_xp, title) VALUES
(1, 0, 'Newcomer'),
(2, 100, 'Scout'),
(3, 300, 'Explorer'),
(4, 600, 'Tracker'),
(5, 1000, 'Hunter'),
(6, 1500, 'Analyst'),
(7, 2200, 'Expert'),
(8, 3000, 'Master'),
(9, 4000, 'Guru'),
(10, 5200, 'Legend'),
(11, 6600, 'Mythic'),
(12, 8200, 'Titan'),
(13, 10000, 'Oracle'),
(14, 12000, 'Sage'),
(15, 14500, 'Visionary')
ON CONFLICT (level) DO NOTHING;

-- Step 4: Insert basic achievements
INSERT INTO achievements (name, description, xp_reward, category, requirements) VALUES
('First Trend', 'Submit your first trend', 50, 'submission', '{"trends_submitted": 1}'),
('Trend Spotter', 'Submit 10 trends', 100, 'submission', '{"trends_submitted": 10}'),
('Trend Master', 'Submit 100 trends', 500, 'submission', '{"trends_submitted": 100}'),
('Validator', 'Complete 10 validations', 75, 'validation', '{"validations_completed": 10}'),
('Quality Control', 'Complete 100 validations', 300, 'validation', '{"validations_completed": 100}'),
('Week Warrior', '7-day submission streak', 200, 'streak', '{"daily_streak": 7}'),
('Early Adopter', 'Joined before XP system', 500, 'legacy', '{"legacy_user": true}'),
('Validation Veteran', 'Validated in the old system', 200, 'legacy', '{"legacy_validator": true}')
ON CONFLICT (name) DO NOTHING;

-- Step 5: Add XP columns to trend_submissions (if it's a table)
DO $$ 
BEGIN
    -- Check if trend_submissions is a table (not a view)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions' 
        AND table_type = 'BASE TABLE'
    ) THEN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'trend_submissions' 
                      AND column_name = 'xp_awarded') THEN
            ALTER TABLE trend_submissions ADD COLUMN xp_awarded INTEGER DEFAULT 0;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'trend_submissions' 
                      AND column_name = 'quality_score') THEN
            ALTER TABLE trend_submissions ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 1.0;
        END IF;
    END IF;
END $$;

-- Step 6: Create XP award function
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
    v_new_level INTEGER;
BEGIN
    -- Insert XP transaction
    INSERT INTO xp_transactions (user_id, amount, type, description)
    VALUES (p_user_id, p_amount, p_type, p_description);
    
    -- Update user's total XP
    INSERT INTO user_xp (user_id, total_xp)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id) DO UPDATE
    SET total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;
    
    -- Calculate and update level
    SELECT MAX(level) INTO v_new_level
    FROM xp_levels 
    WHERE required_xp <= v_new_total;
    
    UPDATE user_xp 
    SET current_level = v_new_level,
        xp_to_next_level = (
            SELECT MIN(required_xp) - v_new_total 
            FROM xp_levels 
            WHERE required_xp > v_new_total
        )
    WHERE user_id = p_user_id;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger for automatic XP on trend submission
CREATE OR REPLACE FUNCTION award_trend_submission_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 25 XP for new trend submissions
    PERFORM award_xp(NEW.spotter_id, 25, 'trend_submission', 'Trend submitted');
    
    -- Update the xp_awarded column if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'trend_submissions' 
              AND column_name = 'xp_awarded') THEN
        UPDATE trend_submissions SET xp_awarded = 25 WHERE id = NEW.id;
    END IF;
    
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

-- Step 8: Create trigger for validation XP
CREATE OR REPLACE FUNCTION award_validation_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 5 XP for validations
    PERFORM award_xp(NEW.validator_id, 5, 'validation_vote', 'Validation completed');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_validation_xp') THEN
        CREATE TRIGGER trigger_award_validation_xp
        AFTER INSERT ON validations
        FOR EACH ROW
        EXECUTE FUNCTION award_validation_xp();
    END IF;
END $$;

-- Step 9: Create leaderboard view
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT 
    u.user_id,
    p.username,
    p.avatar_url,
    u.total_xp,
    u.current_level,
    l.title as level_title,
    RANK() OVER (ORDER BY u.total_xp DESC) as global_rank
FROM user_xp u
JOIN profiles p ON u.user_id = p.id
LEFT JOIN xp_levels l ON u.current_level = l.level;

-- Step 10: Create weekly leaderboard view
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

-- Step 11: Enable RLS on new tables
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_settings ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS policies
CREATE POLICY "Anyone can view XP scores" ON user_xp
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view all achievements" ON achievements
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view and update their XP settings" ON user_xp_settings
    FOR ALL USING (auth.uid() = user_id);

-- Step 13: Migrate existing users to XP system
DO $$
DECLARE
    v_user RECORD;
    v_trends_count INTEGER;
    v_validations_count INTEGER;
    v_bonus_xp INTEGER;
BEGIN
    -- Loop through all existing users
    FOR v_user IN SELECT id FROM auth.users LOOP
        -- Count their trends
        SELECT COUNT(*) INTO v_trends_count 
        FROM trend_submissions 
        WHERE spotter_id = v_user.id;
        
        -- Count their validations
        SELECT COUNT(*) INTO v_validations_count 
        FROM validations 
        WHERE validator_id = v_user.id;
        
        -- Calculate bonus XP (10 per trend, 5 per validation, 100 welcome bonus)
        v_bonus_xp := (v_trends_count * 10) + (v_validations_count * 5) + 100;
        
        -- Award the migration bonus XP
        IF v_bonus_xp > 0 THEN
            PERFORM award_xp(
                v_user.id, 
                v_bonus_xp, 
                'migration_bonus', 
                format('Welcome bonus: %s trends, %s validations', v_trends_count, v_validations_count)
            );
        END IF;
        
        -- Create XP settings for user
        INSERT INTO user_xp_settings (user_id, xp_migrated)
        VALUES (v_user.id, true)
        ON CONFLICT (user_id) DO UPDATE
        SET xp_migrated = true;
        
        -- Award Early Adopter achievement
        INSERT INTO user_achievements (user_id, achievement_id)
        SELECT v_user.id, id FROM achievements WHERE name = 'Early Adopter'
        ON CONFLICT DO NOTHING;
        
        -- Award achievement if they have trends
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
        
        -- Award validation achievement
        IF v_validations_count >= 10 THEN
            INSERT INTO user_achievements (user_id, achievement_id)
            SELECT v_user.id, id FROM achievements WHERE name = 'Validator'
            ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Migration completed for all users';
END $$;

-- Step 14: Verify the migration
SELECT 
    'Migration Summary' as info,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM user_xp) as users_with_xp,
    (SELECT COUNT(*) FROM xp_transactions) as total_xp_transactions,
    (SELECT COUNT(*) FROM achievements) as total_achievements,
    (SELECT COUNT(*) FROM user_achievements) as achievements_earned,
    (SELECT COALESCE(AVG(total_xp), 0)::INTEGER FROM user_xp) as avg_xp_per_user,
    (SELECT COALESCE(MAX(total_xp), 0) FROM user_xp) as highest_xp;

-- Show top 10 users by XP
SELECT 
    username,
    total_xp,
    current_level,
    level_title
FROM xp_leaderboard
LIMIT 10;