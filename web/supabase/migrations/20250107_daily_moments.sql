-- Daily Moments (BeReal-style feature)
-- Random daily prompts with 2-minute submission window

-- Table for daily moment prompts
CREATE TABLE daily_moment_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_time TIMESTAMPTZ NOT NULL,
    prompt_text TEXT NOT NULL DEFAULT 'What''s everyone doing today?',
    window_closes_at TIMESTAMPTZ NOT NULL, -- prompt_time + 2 minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Index for finding active prompts
    INDEX idx_active_prompts ON daily_moment_prompts(prompt_time, window_closes_at)
);

-- Table for daily moment submissions
CREATE TABLE daily_moment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID REFERENCES daily_moment_prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- The trend/behavior they're seeing
    trend_spotted TEXT NOT NULL,
    screenshot_url TEXT,
    platform TEXT,
    location TEXT, -- Optional: where they're seeing this (e.g., "NYC", "Online", "Campus")
    
    -- Submission timing
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    submission_time_seconds INTEGER NOT NULL, -- How many seconds after prompt
    on_time BOOLEAN NOT NULL DEFAULT false, -- Submitted within 2-minute window
    
    -- Engagement
    reacts JSONB DEFAULT '{"fire": 0, "real": 0, "cap": 0, "late": 0}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one submission per user per prompt
    UNIQUE(prompt_id, user_id)
);

-- Table for daily moment reactions
CREATE TABLE daily_moment_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID REFERENCES daily_moment_submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('fire', 'real', 'cap', 'late')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- One reaction per user per submission
    UNIQUE(submission_id, user_id)
);

-- Table for daily moment streaks
CREATE TABLE daily_moment_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_moments INTEGER DEFAULT 0,
    last_submission_date DATE,
    
    -- Stats
    on_time_submissions INTEGER DEFAULT 0,
    late_submissions INTEGER DEFAULT 0,
    average_response_time_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update streak when user submits
CREATE OR REPLACE FUNCTION update_moment_streak()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process on-time submissions for streaks
    IF NEW.on_time THEN
        INSERT INTO daily_moment_streaks (
            user_id,
            current_streak,
            longest_streak,
            total_moments,
            last_submission_date,
            on_time_submissions
        ) VALUES (
            NEW.user_id,
            1,
            1,
            1,
            CURRENT_DATE,
            1
        )
        ON CONFLICT (user_id) DO UPDATE SET
            current_streak = CASE
                -- Continue streak if submitted yesterday
                WHEN daily_moment_streaks.last_submission_date = CURRENT_DATE - INTERVAL '1 day' 
                THEN daily_moment_streaks.current_streak + 1
                -- Reset streak if missed days
                WHEN daily_moment_streaks.last_submission_date < CURRENT_DATE - INTERVAL '1 day'
                THEN 1
                -- Same day, don't increment
                ELSE daily_moment_streaks.current_streak
            END,
            longest_streak = GREATEST(
                daily_moment_streaks.longest_streak,
                CASE
                    WHEN daily_moment_streaks.last_submission_date = CURRENT_DATE - INTERVAL '1 day'
                    THEN daily_moment_streaks.current_streak + 1
                    ELSE daily_moment_streaks.current_streak
                END
            ),
            total_moments = daily_moment_streaks.total_moments + 1,
            on_time_submissions = daily_moment_streaks.on_time_submissions + 1,
            last_submission_date = CURRENT_DATE,
            updated_at = NOW();
    ELSE
        -- Update late submission stats
        INSERT INTO daily_moment_streaks (
            user_id,
            total_moments,
            late_submissions
        ) VALUES (
            NEW.user_id,
            1,
            1
        )
        ON CONFLICT (user_id) DO UPDATE SET
            total_moments = daily_moment_streaks.total_moments + 1,
            late_submissions = daily_moment_streaks.late_submissions + 1,
            updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for streak updates
CREATE TRIGGER update_moment_streak_trigger
AFTER INSERT ON daily_moment_submissions
FOR EACH ROW
EXECUTE FUNCTION update_moment_streak();

-- Function to create daily prompt at random time
CREATE OR REPLACE FUNCTION create_daily_prompt()
RETURNS void AS $$
DECLARE
    random_hour INTEGER;
    random_minute INTEGER;
    prompt_time TIMESTAMPTZ;
BEGIN
    -- Generate random time between 9 AM and 9 PM in user's timezone
    random_hour := 9 + floor(random() * 12)::integer;
    random_minute := floor(random() * 60)::integer;
    
    -- Create prompt for today at random time
    prompt_time := CURRENT_DATE + (random_hour || ' hours')::interval + (random_minute || ' minutes')::interval;
    
    -- Insert new prompt with 2-minute window
    INSERT INTO daily_moment_prompts (
        prompt_time,
        window_closes_at
    ) VALUES (
        prompt_time,
        prompt_time + INTERVAL '2 minutes'
    );
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX idx_moment_submissions_user ON daily_moment_submissions(user_id);
CREATE INDEX idx_moment_submissions_prompt ON daily_moment_submissions(prompt_id);
CREATE INDEX idx_moment_reactions_submission ON daily_moment_reactions(submission_id);
CREATE INDEX idx_moment_streaks_user ON daily_moment_streaks(user_id);

-- RLS Policies
ALTER TABLE daily_moment_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_moment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_moment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_moment_streaks ENABLE ROW LEVEL SECURITY;

-- Everyone can see prompts
CREATE POLICY "Public prompts" ON daily_moment_prompts
    FOR ALL USING (true);

-- Users can insert their own submissions
CREATE POLICY "Users can submit" ON daily_moment_submissions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Everyone can view submissions after window closes
CREATE POLICY "View submissions after window" ON daily_moment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM daily_moment_prompts
            WHERE id = daily_moment_submissions.prompt_id
            AND window_closes_at < NOW()
        )
    );

-- Users can react to submissions
CREATE POLICY "Users can react" ON daily_moment_reactions
    FOR ALL USING (auth.uid() = user_id);

-- Users can view their own streaks
CREATE POLICY "View own streak" ON daily_moment_streaks
    FOR SELECT USING (auth.uid() = user_id);