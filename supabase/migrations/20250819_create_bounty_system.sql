-- =============================================
-- BOUNTY SYSTEM SCHEMA
-- =============================================
-- Enables enterprises to create targeted trend-spotting bounties
-- with multiplied rewards for spotters

-- Bounties table - stores all bounty campaigns
CREATE TABLE IF NOT EXISTS bounties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    enterprise_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Bounty details
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requirements JSONB DEFAULT '[]'::jsonb, -- Array of requirement strings
    
    -- Targeting
    target_demographics JSONB DEFAULT '{}'::jsonb, -- Age, location, interests, etc.
    target_platforms TEXT[] DEFAULT '{}', -- ['tiktok', 'instagram', 'twitter', etc.]
    target_expertise TEXT[] DEFAULT '{}', -- ['nurse', 'teacher', 'developer', etc.]
    
    -- Pricing and limits
    price_per_spot DECIMAL(10, 2) NOT NULL,
    total_spots INTEGER NOT NULL,
    filled_spots INTEGER DEFAULT 0,
    
    -- Timing
    urgency_level TEXT CHECK (urgency_level IN ('lightning', 'rapid', 'standard')) NOT NULL,
    duration_minutes INTEGER NOT NULL, -- 5, 30, 120, etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Status
    status TEXT CHECK (status IN ('active', 'paused', 'completed', 'cancelled')) DEFAULT 'active',
    
    -- Results delivery
    webhook_url TEXT,
    notification_email TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Bounty submissions - tracks all submissions for bounties
CREATE TABLE IF NOT EXISTS bounty_submissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    spotter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES trends(id) ON DELETE SET NULL,
    
    -- Submission content
    headline TEXT NOT NULL,
    description TEXT,
    link TEXT NOT NULL, -- Required for bounties
    screenshot_url TEXT,
    platform TEXT,
    
    -- Validation
    status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'duplicate')) DEFAULT 'pending',
    validation_score DECIMAL(3, 2) DEFAULT 0,
    duplicate_of UUID REFERENCES bounty_submissions(id),
    
    -- Earnings
    earned_amount DECIMAL(10, 2),
    multiplier DECIMAL(3, 2) DEFAULT 1.0,
    
    -- Timestamps
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Active hunts - tracks which spotters are actively hunting which bounties
CREATE TABLE IF NOT EXISTS active_hunts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    spotter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Hunt status
    started_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity TIMESTAMPTZ DEFAULT NOW(),
    submissions_count INTEGER DEFAULT 0,
    approved_count INTEGER DEFAULT 0,
    earned_total DECIMAL(10, 2) DEFAULT 0,
    
    -- Make sure one spotter can only have one active hunt per bounty
    UNIQUE(bounty_id, spotter_id)
);

-- Bounty matches - pre-calculated matches for spotters based on their profile
CREATE TABLE IF NOT EXISTS bounty_matches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bounty_id UUID NOT NULL REFERENCES bounties(id) ON DELETE CASCADE,
    spotter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Match score and reasons
    match_score DECIMAL(3, 2) NOT NULL, -- 0-1 score
    match_reasons TEXT[] DEFAULT '{}', -- ['Nurse', 'TikTok user', 'In target age']
    
    -- Notification status
    notified BOOLEAN DEFAULT FALSE,
    notified_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(bounty_id, spotter_id)
);

-- Add bounty-related columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
    expertise TEXT[] DEFAULT '{}';
    
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
    preferred_platforms TEXT[] DEFAULT '{}';
    
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
    bounty_notifications BOOLEAN DEFAULT TRUE;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
    total_bounties_completed INTEGER DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS 
    bounty_success_rate DECIMAL(3, 2) DEFAULT 0;

-- Add bounty reference to trends table
ALTER TABLE trends ADD COLUMN IF NOT EXISTS 
    bounty_id UUID REFERENCES bounties(id) ON DELETE SET NULL;

ALTER TABLE trends ADD COLUMN IF NOT EXISTS 
    is_bounty_submission BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bounties_enterprise ON bounties(enterprise_id);
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties(status);
CREATE INDEX IF NOT EXISTS idx_bounties_expires ON bounties(expires_at);
CREATE INDEX IF NOT EXISTS idx_bounty_submissions_bounty ON bounty_submissions(bounty_id);
CREATE INDEX IF NOT EXISTS idx_bounty_submissions_spotter ON bounty_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_bounty_submissions_status ON bounty_submissions(status);
CREATE INDEX IF NOT EXISTS idx_active_hunts_bounty ON active_hunts(bounty_id);
CREATE INDEX IF NOT EXISTS idx_active_hunts_spotter ON active_hunts(spotter_id);
CREATE INDEX IF NOT EXISTS idx_bounty_matches_spotter ON bounty_matches(spotter_id);
CREATE INDEX IF NOT EXISTS idx_bounty_matches_score ON bounty_matches(match_score DESC);

-- Row Level Security
ALTER TABLE bounties ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_hunts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounty_matches ENABLE ROW LEVEL SECURITY;

-- Bounties policies
CREATE POLICY "Enterprises can create and manage their bounties" ON bounties
    FOR ALL USING (auth.uid() = enterprise_id);

CREATE POLICY "Active bounties are visible to all authenticated users" ON bounties
    FOR SELECT USING (auth.uid() IS NOT NULL AND status = 'active');

-- Bounty submissions policies
CREATE POLICY "Spotters can create and view their submissions" ON bounty_submissions
    FOR ALL USING (auth.uid() = spotter_id);

CREATE POLICY "Enterprises can view submissions to their bounties" ON bounty_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM bounties 
            WHERE bounties.id = bounty_submissions.bounty_id 
            AND bounties.enterprise_id = auth.uid()
        )
    );

-- Active hunts policies
CREATE POLICY "Users can manage their own hunts" ON active_hunts
    FOR ALL USING (auth.uid() = spotter_id);

-- Bounty matches policies
CREATE POLICY "Users can view their own matches" ON bounty_matches
    FOR SELECT USING (auth.uid() = spotter_id);

-- Function to update bounty stats when submission is approved
CREATE OR REPLACE FUNCTION update_bounty_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        -- Update bounty filled spots
        UPDATE bounties 
        SET filled_spots = filled_spots + 1
        WHERE id = NEW.bounty_id;
        
        -- Update active hunt stats
        UPDATE active_hunts 
        SET 
            approved_count = approved_count + 1,
            earned_total = earned_total + NEW.earned_amount,
            last_activity = NOW()
        WHERE bounty_id = NEW.bounty_id 
        AND spotter_id = NEW.spotter_id;
        
        -- Update spotter stats
        UPDATE profiles 
        SET 
            total_bounties_completed = total_bounties_completed + 1
        WHERE id = NEW.spotter_id;
        
        -- Check if bounty is complete
        UPDATE bounties 
        SET status = 'completed'
        WHERE id = NEW.bounty_id 
        AND filled_spots >= total_spots;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bounty_stats_trigger
    AFTER UPDATE ON bounty_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_bounty_stats();

-- Function to calculate bounty match scores
CREATE OR REPLACE FUNCTION calculate_bounty_match(
    p_bounty_id UUID,
    p_spotter_id UUID
)
RETURNS TABLE (
    match_score DECIMAL,
    match_reasons TEXT[]
) AS $$
DECLARE
    v_bounty bounties%ROWTYPE;
    v_profile profiles%ROWTYPE;
    v_score DECIMAL := 0;
    v_reasons TEXT[] := '{}';
BEGIN
    -- Get bounty and profile
    SELECT * INTO v_bounty FROM bounties WHERE id = p_bounty_id;
    SELECT * INTO v_profile FROM profiles WHERE id = p_spotter_id;
    
    -- Check platform match
    IF v_profile.preferred_platforms && v_bounty.target_platforms THEN
        v_score := v_score + 0.3;
        v_reasons := array_append(v_reasons, 'Platform match');
    END IF;
    
    -- Check expertise match
    IF v_profile.expertise && v_bounty.target_expertise THEN
        v_score := v_score + 0.4;
        v_reasons := array_append(v_reasons, 'Expertise match');
    END IF;
    
    -- Check demographics match (if implemented)
    -- This would check age, location, etc. from target_demographics JSONB
    
    -- Base score for all users
    v_score := GREATEST(v_score, 0.3);
    
    RETURN QUERY SELECT v_score, v_reasons;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire bounties
CREATE OR REPLACE FUNCTION expire_bounties()
RETURNS void AS $$
BEGIN
    UPDATE bounties 
    SET status = 'completed'
    WHERE status = 'active' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to expire bounties (requires pg_cron extension)
-- SELECT cron.schedule('expire-bounties', '*/1 * * * *', 'SELECT expire_bounties();');