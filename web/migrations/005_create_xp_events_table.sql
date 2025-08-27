-- Create xp_events table if it doesn't exist for tracking XP history
CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'trend_submitted', 'trend_validated', 'validation', etc.
    xp_change INTEGER NOT NULL, -- Can be positive or negative
    description TEXT,
    reference_id UUID, -- ID of related trend, validation, etc.
    reference_type TEXT, -- 'trend_submission', 'validation', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own XP events" ON xp_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage XP events" ON xp_events
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON xp_events TO authenticated;
GRANT ALL ON xp_events TO service_role;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_xp_events_user_id ON xp_events(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_created_at ON xp_events(created_at);
CREATE INDEX IF NOT EXISTS idx_xp_events_reference ON xp_events(reference_id, reference_type);

-- Update the award_xp function to automatically create XP events
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    -- Insert or update user_xp
    INSERT INTO user_xp (user_id, total_xp, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;

    -- Create XP event record
    INSERT INTO xp_events (
        user_id,
        event_type,
        xp_change,
        description,
        reference_id,
        reference_type
    ) VALUES (
        p_user_id,
        p_type,
        p_amount,
        COALESCE(p_description, p_type || ' +' || p_amount || ' XP'),
        p_reference_id,
        p_reference_type
    );

    RETURN v_new_total;
END;
$$;