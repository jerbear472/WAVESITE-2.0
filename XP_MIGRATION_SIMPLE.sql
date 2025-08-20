-- =============================================
-- SIMPLE XP SYSTEM MIGRATION
-- Copy and paste this into Supabase SQL Editor
-- =============================================

-- Step 1: Create XP tables
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

-- Step 2: Insert XP levels
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
(10, 5200, 'Legend')
ON CONFLICT (level) DO NOTHING;

-- Step 3: Insert basic achievements
INSERT INTO achievements (name, description, xp_reward, category, requirements) VALUES
('First Trend', 'Submit your first trend', 50, 'submission', '{"trends_submitted": 1}'),
('Trend Spotter', 'Submit 10 trends', 100, 'submission', '{"trends_submitted": 10}'),
('Validator', 'Complete 10 validations', 75, 'validation', '{"validations_completed": 10}'),
('Early Adopter', 'Joined before XP system', 500, 'legacy', '{"legacy_user": true}')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Add XP columns to existing tables
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS display_level BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS display_achievements BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS xp_migrated BOOLEAN DEFAULT false;

ALTER TABLE trend_submissions
    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quality_score DECIMAL(3,2) DEFAULT 1.0;

-- Step 5: Create simple XP award function
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_new_total INTEGER;
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
    
    -- Update level
    UPDATE user_xp 
    SET current_level = (
        SELECT MAX(level) FROM xp_levels WHERE required_xp <= v_new_total
    )
    WHERE user_id = p_user_id;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create triggers for automatic XP
CREATE OR REPLACE FUNCTION award_trend_submission_xp()
RETURNS TRIGGER AS $$
BEGIN
    -- Award 25 XP for new trend submissions
    PERFORM award_xp(NEW.spotter_id, 25, 'trend_submission', 'Trend submitted');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_trend_xp') THEN
        CREATE TRIGGER trigger_award_trend_xp
        AFTER INSERT ON trend_submissions
        FOR EACH ROW
        EXECUTE FUNCTION award_trend_submission_xp();
    END IF;
END $$;

-- Step 7: Create leaderboard view
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

-- Step 8: Enable RLS
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "Users can view all XP" ON user_xp
    FOR SELECT USING (true);

CREATE POLICY "Users can view their own XP transactions" ON xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (auth.uid() = user_id);

-- Step 9: Migrate existing users (give them XP for their past activity)
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
        
        -- Calculate bonus XP
        v_bonus_xp := (v_trends_count * 10) + (v_validations_count * 5) + 100; -- 100 XP welcome bonus
        
        -- Award the XP
        IF v_bonus_xp > 0 THEN
            PERFORM award_xp(v_user.id, v_bonus_xp, 'migration_bonus', 
                'Welcome to XP system! Bonus for your past contributions');
        END IF;
        
        -- Award Early Adopter achievement
        INSERT INTO user_achievements (user_id, achievement_id)
        SELECT v_user.id, id FROM achievements WHERE name = 'Early Adopter'
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Step 10: Verify migration
SELECT 
    (SELECT COUNT(*) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM user_xp) as users_with_xp,
    (SELECT COUNT(*) FROM xp_transactions) as xp_transactions,
    (SELECT COUNT(*) FROM achievements) as achievements_created;