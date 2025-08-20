-- =============================================
-- SAFE XP SYSTEM MIGRATION
-- This version checks for existing tables first
-- =============================================

-- Step 1: Create XP core tables (these are new, safe to create)
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

CREATE TABLE IF NOT EXISTS public.user_xp_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_level BOOLEAN DEFAULT true,
    display_achievements BOOLEAN DEFAULT true,
    favorite_achievement_id UUID REFERENCES achievements(id),
    xp_migrated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
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
('Early Adopter', 'Joined before XP system', 500, 'legacy', '{"legacy_user": true}'),
('Active User', 'Regular platform user', 200, 'legacy', '{"active_user": true}')
ON CONFLICT (name) DO NOTHING;

-- Step 4: Create XP award function
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
    SET current_level = COALESCE(v_new_level, 1),
        xp_to_next_level = (
            SELECT MIN(required_xp) - v_new_total 
            FROM xp_levels 
            WHERE required_xp > v_new_total
        )
    WHERE user_id = p_user_id;
    
    RETURN v_new_total;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger for trend submissions (only if table exists)
DO $$
BEGIN
    -- Check if trend_submissions table exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
        AND table_type = 'BASE TABLE'
    ) THEN
        -- Create trigger function
        CREATE OR REPLACE FUNCTION award_trend_submission_xp()
        RETURNS TRIGGER AS $func$
        BEGIN
            -- Award 25 XP for new trend submissions
            PERFORM award_xp(NEW.spotter_id, 25, 'trend_submission', 'Trend submitted');
            RETURN NEW;
        END;
        $func$ LANGUAGE plpgsql;
        
        -- Create trigger if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_award_trend_xp') THEN
            EXECUTE 'CREATE TRIGGER trigger_award_trend_xp
                    AFTER INSERT ON trend_submissions
                    FOR EACH ROW
                    EXECUTE FUNCTION award_trend_submission_xp()';
        END IF;
        
        RAISE NOTICE 'Trend submission XP trigger created';
    ELSE
        RAISE NOTICE 'trend_submissions table not found - skipping trigger';
    END IF;
END $$;

-- Step 6: Check for validation-related tables and create appropriate triggers
DO $$
DECLARE
    v_validation_table TEXT;
BEGIN
    -- Try to find the validation table
    SELECT table_name INTO v_validation_table
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    AND (
        table_name = 'validations'
        OR table_name = 'validation_votes'
        OR table_name = 'trend_validations'
        OR table_name LIKE '%validation%'
    )
    LIMIT 1;
    
    IF v_validation_table IS NOT NULL THEN
        RAISE NOTICE 'Found validation table: %', v_validation_table;
        -- We'll add validation triggers manually after checking the schema
    ELSE
        RAISE NOTICE 'No validation table found - validation XP will need manual setup';
    END IF;
END $$;

-- Step 7: Enable RLS on new tables
ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp_settings ENABLE ROW LEVEL SECURITY;

-- Step 8: Create RLS policies
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

-- Step 9: Create leaderboard views
CREATE OR REPLACE VIEW xp_leaderboard AS
SELECT 
    u.user_id,
    COALESCE(p.username, 'User') as username,
    p.avatar_url,
    u.total_xp,
    u.current_level,
    l.title as level_title,
    RANK() OVER (ORDER BY u.total_xp DESC) as global_rank
FROM user_xp u
LEFT JOIN profiles p ON u.user_id = p.id
LEFT JOIN xp_levels l ON u.current_level = l.level;

-- Step 10: Simple migration for existing users
DO $$
DECLARE
    v_user RECORD;
    v_trends_count INTEGER;
    v_bonus_xp INTEGER;
BEGIN
    -- Loop through all existing users
    FOR v_user IN SELECT id FROM auth.users LIMIT 1000 LOOP  -- Limit for safety
        v_bonus_xp := 100;  -- Base welcome bonus
        
        -- Try to count trends if table exists
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = 'trend_submissions'
        ) THEN
            EXECUTE 'SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = $1'
            INTO v_trends_count
            USING v_user.id;
            
            v_bonus_xp := v_bonus_xp + (COALESCE(v_trends_count, 0) * 10);
        END IF;
        
        -- Award the migration bonus XP
        IF v_bonus_xp > 0 THEN
            PERFORM award_xp(
                v_user.id, 
                v_bonus_xp, 
                'migration_bonus', 
                'Welcome to the XP system!'
            );
        END IF;
        
        -- Create XP settings for user
        INSERT INTO user_xp_settings (user_id, xp_migrated)
        VALUES (v_user.id, true)
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Award Early Adopter achievement
        INSERT INTO user_achievements (user_id, achievement_id)
        SELECT v_user.id, id FROM achievements WHERE name = 'Early Adopter'
        ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Migration completed for existing users';
END $$;

-- Step 11: Verify the migration
SELECT 
    'XP System Migration Complete!' as status,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM user_xp) as users_with_xp,
    (SELECT COUNT(*) FROM xp_transactions) as xp_transactions_created,
    (SELECT COUNT(*) FROM achievements) as achievements_available,
    (SELECT COALESCE(AVG(total_xp), 0)::INTEGER FROM user_xp) as avg_xp_per_user;

-- Show tables that were created
SELECT 
    'Created XP Tables:' as info,
    string_agg(table_name, ', ') as new_tables
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('user_xp', 'xp_transactions', 'xp_levels', 'achievements', 'user_achievements', 'user_xp_settings');