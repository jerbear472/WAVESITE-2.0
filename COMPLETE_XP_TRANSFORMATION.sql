-- =============================================
-- COMPLETE XP TRANSFORMATION FOR FREEWAVESIGHT
-- Transform platform to Cultural Anthropology XP System
-- =============================================

-- 1. Update XP levels with Cultural Anthropologist titles
-- =============================================
TRUNCATE TABLE xp_levels CASCADE;

INSERT INTO xp_levels (level, required_xp, title, perks, badge_url) VALUES
(1, 0, 'Observer', '["Basic trend spotting", "Access to training materials"]', NULL),
(2, 100, 'Cultural Scout', '["Validation access", "Community forums"]', NULL),
(3, 300, 'Pattern Seeker', '["Profile badges", "Trend history"]', NULL),
(4, 600, 'Wave Tracker', '["Custom avatar frame", "Priority queue"]', NULL),
(5, 1000, 'Trend Analyst', '["Advanced analytics", "Trend insights"]', NULL),
(6, 1500, 'Cultural Decoder', '["Pattern recognition tools", "Export data"]', NULL),
(7, 2200, 'Wave Expert', '["Moderator tools", "Mentor badge"]', NULL),
(8, 3000, 'Master Anthropologist', '["Elite status", "2x XP multiplier", "Prize eligibility"]', NULL),
(9, 4000, 'Cultural Sage', '["Custom title", "Private channels"]', NULL),
(10, 5200, 'Wave Prophet', '["Hall of fame", "3x XP multiplier", "Priority prize pool"]', NULL),
(11, 6600, 'Mythic Observer', '["Exclusive content", "Beta features"]', NULL),
(12, 8200, 'Cultural Titan', '["Community leader", "Event host privileges"]', NULL),
(13, 10000, 'Wave Oracle', '["Special recognition", "Platform advisor"]', NULL),
(14, 12000, 'Master of Waves', '["Mentor status", "Training creator"]', NULL),
(15, 14500, 'Cultural Visionary', '["Platform influencer", "Top prize tier", "Custom perks"]', NULL);

-- 2. Enhanced Achievement System for Cultural Anthropologists
-- =============================================
TRUNCATE TABLE achievements CASCADE;

INSERT INTO achievements (name, description, xp_reward, category, requirements) VALUES
-- Spotting Achievements
('First Wave', 'Spot your first cultural wave', 50, 'submission', '{"trends_submitted": 1}'),
('Wave Rider', 'Spot 10 cultural waves', 100, 'submission', '{"trends_submitted": 10}'),
('Wave Master', 'Spot 100 cultural waves', 500, 'submission', '{"trends_submitted": 100}'),
('Tsunami Spotter', 'Spot 500 cultural waves', 2000, 'submission', '{"trends_submitted": 500}'),

-- Validation Achievements  
('Quality Guardian', 'Complete 10 wave validations', 75, 'validation', '{"validations_completed": 10}'),
('Cultural Curator', 'Complete 100 validations with 80%+ accuracy', 300, 'validation', '{"validations_completed": 100, "accuracy": 80}'),
('Perfect Vision', 'Achieve 95% validation accuracy', 500, 'validation', '{"accuracy": 95}'),

-- Streak Achievements
('Wave Warrior', '7-day spotting streak', 200, 'streak', '{"daily_streak": 7}'),
('Fortnight Fighter', '14-day spotting streak', 400, 'streak', '{"daily_streak": 14}'),
('Monthly Master', '30-day spotting streak', 1000, 'streak', '{"daily_streak": 30}'),
('Century Sage', '100-day spotting streak', 5000, 'streak', '{"daily_streak": 100}'),

-- Cultural Anthropology Achievements
('Cultural Pioneer', 'Spot a wave before it peaks', 500, 'special', '{"early_spot": true}'),
('Viral Prophet', 'Predict a viral wave correctly', 1000, 'special', '{"viral_prediction": true}'),
('Cross-Culture Expert', 'Spot waves across 5+ categories', 300, 'special', '{"diverse_categories": 5}'),
('Night Anthropologist', 'Spot 20 waves between midnight-6am', 250, 'special', '{"night_spots": 20}'),
('Global Observer', 'Spot international cultural trends', 400, 'special', '{"international_trends": 10}'),

-- Competition Achievements
('Prize Eligible', 'Reach top 100 in XP leaderboard', 500, 'community', '{"leaderboard_rank": 100}'),
('Prize Contender', 'Reach top 50 in XP leaderboard', 1000, 'community', '{"leaderboard_rank": 50}'),
('Prize Winner', 'Reach top 10 in XP leaderboard', 2500, 'community', '{"leaderboard_rank": 10}'),
('Cultural Champion', 'Finish #1 in monthly XP competition', 5000, 'community', '{"monthly_winner": true}');

-- 3. Create Prize Pool System
-- =============================================
CREATE TABLE IF NOT EXISTS public.prize_pools (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_prize TEXT, -- Text description of prize (not monetary value)
    distribution JSONB, -- How prizes are distributed (1st place, 2nd, etc.)
    eligibility_criteria JSONB, -- Min XP, level requirements, etc.
    status TEXT CHECK (status IN ('upcoming', 'active', 'completed', 'distributed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sample prize pools
INSERT INTO prize_pools (name, description, start_date, end_date, total_prize, distribution, eligibility_criteria, status) VALUES
('Monthly Wave Masters', 'Top cultural anthropologists compete for exclusive prizes', 
 DATE_TRUNC('month', CURRENT_DATE), 
 DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
 'Exclusive merchandise, platform features, and recognition',
 '{
   "1st": "Custom title, exclusive badge, feature access",
   "2nd": "Special badge, bonus XP multiplier",
   "3rd": "Recognition badge, XP boost",
   "top_10": "Hall of fame entry",
   "top_50": "Bonus XP rewards"
 }',
 '{"min_level": 5, "min_monthly_xp": 1000}',
 'active'),

('Weekly Sprint Challenge', 'Fastest wave spotters of the week',
 DATE_TRUNC('week', CURRENT_DATE),
 DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '1 week' - INTERVAL '1 day',
 'XP bonuses and special recognition',
 '{
   "top_3": "500 bonus XP",
   "top_10": "200 bonus XP",
   "participants": "50 bonus XP"
 }',
 '{"min_level": 2}',
 'active');

-- 4. Create Cultural Anthropologist Profiles
-- =============================================
ALTER TABLE profiles
    ADD COLUMN IF NOT EXISTS anthropologist_title TEXT,
    ADD COLUMN IF NOT EXISTS specialization TEXT[], -- Categories they excel at
    ADD COLUMN IF NOT EXISTS wave_accuracy DECIMAL(5,2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS waves_spotted INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS waves_validated INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS cultural_insights INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS prize_wins INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS competition_rank INTEGER;

-- 5. Update XP Configuration for Cultural Focus
-- =============================================
UPDATE xp_config SET value = '{
    "trend_submission": 30,
    "validation_vote": 10,
    "trend_approved": 75,
    "early_spot_bonus": 50,
    "accuracy_bonus": 25,
    "cultural_insight": 40,
    "daily_login": 15,
    "perfect_validation": 25,
    "wave_prediction_correct": 100
}' WHERE key = 'base_rates';

UPDATE xp_config SET value = '{
    "tier_multipliers": {
        "observer": 1.0,
        "scout": 1.2,
        "analyst": 1.5,
        "expert": 2.0,
        "master": 2.5,
        "prophet": 3.0,
        "visionary": 4.0
    },
    "streak_multipliers": {
        "3_days": 1.2,
        "7_days": 1.5,
        "14_days": 2.0,
        "30_days": 3.0,
        "100_days": 5.0
    },
    "accuracy_multipliers": {
        "below_60": 0.5,
        "60_to_79": 1.0,
        "80_to_94": 1.5,
        "95_plus": 2.0
    },
    "timing_multipliers": {
        "before_peak": 2.0,
        "during_rise": 1.5,
        "at_peak": 1.0,
        "after_peak": 0.5
    }
}' WHERE key = 'multipliers';

-- 6. Create Wave Prediction Accuracy Tracking
-- =============================================
CREATE TABLE IF NOT EXISTS public.wave_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID NOT NULL REFERENCES trend_submissions(id) ON DELETE CASCADE,
    predicted_peak_timing TEXT,
    predicted_virality INTEGER,
    actual_peak_timing TEXT,
    actual_virality INTEGER,
    accuracy_score DECIMAL(5,2),
    xp_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    evaluated_at TIMESTAMPTZ
);

-- 7. Enhanced Leaderboard Views
-- =============================================
DROP VIEW IF EXISTS xp_leaderboard CASCADE;
CREATE VIEW xp_leaderboard AS
SELECT 
    u.user_id,
    p.username,
    p.avatar_url,
    p.anthropologist_title,
    u.total_xp,
    u.current_level,
    l.title as level_title,
    p.wave_accuracy,
    p.waves_spotted,
    p.specialization,
    COUNT(DISTINCT ua.achievement_id) as achievement_count,
    RANK() OVER (ORDER BY u.total_xp DESC) as global_rank,
    CASE 
        WHEN RANK() OVER (ORDER BY u.total_xp DESC) <= 10 THEN 'prize_tier_1'
        WHEN RANK() OVER (ORDER BY u.total_xp DESC) <= 50 THEN 'prize_tier_2'
        WHEN RANK() OVER (ORDER BY u.total_xp DESC) <= 100 THEN 'prize_tier_3'
        ELSE 'standard'
    END as prize_tier
FROM user_xp u
JOIN profiles p ON u.user_id = p.id
LEFT JOIN xp_levels l ON u.current_level = l.level
LEFT JOIN user_achievements ua ON u.user_id = ua.user_id
GROUP BY u.user_id, p.username, p.avatar_url, p.anthropologist_title, 
         u.total_xp, u.current_level, l.title, p.wave_accuracy, 
         p.waves_spotted, p.specialization;

-- 8. Create Cultural Anthropologist Dashboard View
-- =============================================
CREATE OR REPLACE VIEW anthropologist_dashboard AS
SELECT 
    p.id as user_id,
    p.username,
    p.anthropologist_title,
    u.total_xp,
    u.current_level,
    l.title as level_title,
    l.perks as level_perks,
    p.wave_accuracy,
    p.waves_spotted,
    p.waves_validated,
    p.cultural_insights,
    p.prize_wins,
    p.competition_rank,
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = p.id AND created_at >= NOW() - INTERVAL '24 hours') as waves_today,
    (SELECT COUNT(*) FROM trend_submissions WHERE spotter_id = p.id AND created_at >= NOW() - INTERVAL '7 days') as waves_this_week,
    (SELECT COUNT(*) FROM validations WHERE validator_id = p.id AND created_at >= NOW() - INTERVAL '7 days') as validations_this_week,
    COALESCE((SELECT MAX(daily_streak) FROM user_streaks WHERE user_id = p.id), 0) as current_streak,
    (SELECT json_agg(json_build_object(
        'name', a.name,
        'description', a.description,
        'earned_at', ua.earned_at
    )) FROM user_achievements ua 
    JOIN achievements a ON ua.achievement_id = a.id 
    WHERE ua.user_id = p.id) as achievements,
    CASE 
        WHEN pp.status = 'active' THEN json_build_object(
            'name', pp.name,
            'end_date', pp.end_date,
            'rank', RANK() OVER (ORDER BY u.total_xp DESC),
            'eligible', u.current_level >= (pp.eligibility_criteria->>'min_level')::int
        )
        ELSE NULL
    END as active_competition
FROM profiles p
LEFT JOIN user_xp u ON p.id = u.user_id
LEFT JOIN xp_levels l ON u.current_level = l.level
LEFT JOIN prize_pools pp ON pp.status = 'active'
WHERE p.id = auth.uid();

-- 9. Functions for Cultural Wave Analysis
-- =============================================
CREATE OR REPLACE FUNCTION calculate_wave_timing_bonus(
    p_trend_id UUID
) RETURNS DECIMAL AS $$
DECLARE
    v_multiplier DECIMAL;
    v_timing TEXT;
BEGIN
    -- Simplified timing detection (you'd implement real logic here)
    SELECT 
        CASE 
            WHEN virality_prediction > 80 THEN 'before_peak'
            WHEN virality_prediction > 60 THEN 'during_rise'
            WHEN virality_prediction > 40 THEN 'at_peak'
            ELSE 'after_peak'
        END INTO v_timing
    FROM trend_submissions 
    WHERE id = p_trend_id;
    
    SELECT (value->>v_timing)::DECIMAL INTO v_multiplier
    FROM xp_config 
    WHERE key = 'multipliers';
    
    RETURN COALESCE(v_multiplier, 1.0);
END;
$$ LANGUAGE plpgsql;

-- 10. Notification System for Competitions
-- =============================================
CREATE TABLE IF NOT EXISTS public.competition_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('rank_up', 'rank_down', 'prize_eligible', 'competition_end', 'achievement')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Remove ALL remaining earnings/money references
-- =============================================
-- Update any remaining column names
ALTER TABLE trend_submissions 
    RENAME COLUMN earning_amount TO xp_amount;

ALTER TABLE validations
    ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0;

-- Drop old earnings tables if they still exist
DROP TABLE IF EXISTS earnings_ledger CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS cashout_requests CASCADE;
DROP TABLE IF EXISTS stripe_webhooks CASCADE;
DROP TABLE IF EXISTS payment_tiers CASCADE;

-- 12. Create indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_wave_predictions_user ON wave_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_prize_pools_status ON prize_pools(status);
CREATE INDEX IF NOT EXISTS idx_competition_notifications_user ON competition_notifications(user_id, read);

-- 13. Enable RLS for new tables
-- =============================================
ALTER TABLE prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE wave_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view active prize pools" ON prize_pools
    FOR SELECT USING (status IN ('active', 'upcoming', 'completed'));

CREATE POLICY "Users can view their wave predictions" ON wave_predictions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view their notifications" ON competition_notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notification read status" ON competition_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- 14. Final cleanup and messaging
-- =============================================
COMMENT ON TABLE user_xp IS 'Cultural Anthropologist Experience Points tracking';
COMMENT ON TABLE xp_levels IS 'Cultural Anthropologist progression levels';
COMMENT ON TABLE prize_pools IS 'Competition prizes for top cultural anthropologists';
COMMENT ON TABLE wave_predictions IS 'Track accuracy of cultural wave predictions';

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'FreeWaveSight has been transformed into a Cultural Anthropology XP Platform!';
    RAISE NOTICE 'Users are now Cultural Anthropologists earning XP for spotting waves.';
    RAISE NOTICE 'Top performers compete for prizes based on XP rankings.';
END $$;