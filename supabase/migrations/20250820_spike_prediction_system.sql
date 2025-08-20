-- =============================================
-- SPIKE PREDICTION SYSTEM
-- User-submitted proof of cultural wave spikes
-- =============================================

-- 1. Spike Predictions Table
CREATE TABLE IF NOT EXISTS public.spike_predictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    predictor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Original trend info
    trend_title TEXT NOT NULL,
    trend_description TEXT,
    original_link TEXT NOT NULL,
    original_views INTEGER,
    original_platform TEXT CHECK (original_platform IN ('tiktok', 'instagram', 'youtube', 'twitter', 'reddit', 'other')),
    
    -- Prediction details
    prediction_type TEXT CHECK (prediction_type IN ('48_hours', '1_week', '2_weeks', '1_month')) DEFAULT '48_hours',
    predicted_at TIMESTAMPTZ DEFAULT NOW(),
    prediction_due_at TIMESTAMPTZ NOT NULL,
    confidence_level INTEGER CHECK (confidence_level BETWEEN 1 AND 5) DEFAULT 3,
    prediction_reasoning TEXT,
    
    -- Status tracking
    status TEXT CHECK (status IN ('active', 'awaiting_proof', 'proof_submitted', 'validated', 'failed', 'expired')) DEFAULT 'active',
    
    -- Metadata
    tags TEXT[],
    category TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Spike Proofs Table (Evidence submitted after prediction window)
CREATE TABLE IF NOT EXISTS public.spike_proofs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    prediction_id UUID NOT NULL REFERENCES spike_predictions(id) ON DELETE CASCADE,
    submitter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Proof links (multiple pieces of evidence)
    proof_links JSONB NOT NULL DEFAULT '[]', -- Array of {url, platform, views, description}
    
    -- Spike metrics
    total_new_views BIGINT,
    view_multiplier DECIMAL(10,2), -- How many X the views increased
    geographic_spread TEXT[], -- Countries/regions where trend spread
    platform_spread TEXT[], -- Which platforms it spread to
    
    -- Validation
    community_score DECIMAL(3,2) DEFAULT 0, -- 0-1 score from community votes
    validation_status TEXT CHECK (validation_status IN ('pending', 'validated', 'rejected', 'disputed')) DEFAULT 'pending',
    
    -- Evidence quality
    evidence_strength TEXT CHECK (evidence_strength IN ('weak', 'moderate', 'strong', 'overwhelming')) DEFAULT 'moderate',
    
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    
    UNIQUE(prediction_id) -- Only one proof per prediction
);

-- 3. Proof Validation Votes
CREATE TABLE IF NOT EXISTS public.proof_validations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    proof_id UUID NOT NULL REFERENCES spike_proofs(id) ON DELETE CASCADE,
    validator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    vote TEXT CHECK (vote IN ('valid', 'invalid', 'unclear')) NOT NULL,
    vote_weight DECIMAL(3,2) DEFAULT 1.0, -- Weight based on validator reputation
    
    -- Validation criteria
    same_trend_confirmed BOOLEAN DEFAULT false,
    spike_evident BOOLEAN DEFAULT false,
    proof_authentic BOOLEAN DEFAULT false,
    
    feedback TEXT,
    voted_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(proof_id, validator_id) -- One vote per validator per proof
);

-- 4. Prediction Performance Tracking
CREATE TABLE IF NOT EXISTS public.predictor_stats (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Prediction stats
    total_predictions INTEGER DEFAULT 0,
    successful_predictions INTEGER DEFAULT 0,
    failed_predictions INTEGER DEFAULT 0,
    pending_predictions INTEGER DEFAULT 0,
    
    -- Accuracy metrics
    accuracy_rate DECIMAL(5,2) DEFAULT 0, -- Percentage
    average_multiplier DECIMAL(10,2) DEFAULT 0, -- Avg spike size predicted correctly
    best_prediction_multiplier DECIMAL(10,2) DEFAULT 0,
    
    -- Reputation
    predictor_level INTEGER DEFAULT 1,
    predictor_title TEXT DEFAULT 'Novice Prophet',
    reputation_score INTEGER DEFAULT 100,
    
    -- Streaks
    current_success_streak INTEGER DEFAULT 0,
    best_success_streak INTEGER DEFAULT 0,
    
    -- XP from predictions
    total_prediction_xp INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. XP rewards configuration for predictions
INSERT INTO xp_config (key, value) VALUES
('prediction_rewards', '{
    "make_prediction": 10,
    "submit_proof": 50,
    "proof_validated": 100,
    "perfect_prediction": 200,
    "multiple_proof_links": 20,
    "first_to_validate": 10,
    "validation_vote": 5,
    "vote_with_majority": 5,
    "streak_bonus_3": 50,
    "streak_bonus_5": 100,
    "streak_bonus_10": 500
}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 6. Functions for prediction system

-- Function to create a spike prediction
CREATE OR REPLACE FUNCTION create_spike_prediction(
    p_user_id UUID,
    p_trend_title TEXT,
    p_original_link TEXT,
    p_prediction_type TEXT DEFAULT '48_hours',
    p_confidence INTEGER DEFAULT 3,
    p_reasoning TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_prediction_id UUID;
    v_due_date TIMESTAMPTZ;
BEGIN
    -- Calculate due date based on prediction type
    v_due_date := CASE p_prediction_type
        WHEN '48_hours' THEN NOW() + INTERVAL '48 hours'
        WHEN '1_week' THEN NOW() + INTERVAL '1 week'
        WHEN '2_weeks' THEN NOW() + INTERVAL '2 weeks'
        WHEN '1_month' THEN NOW() + INTERVAL '1 month'
        ELSE NOW() + INTERVAL '48 hours'
    END;
    
    -- Create prediction
    INSERT INTO spike_predictions (
        predictor_id,
        trend_title,
        original_link,
        prediction_type,
        prediction_due_at,
        confidence_level,
        prediction_reasoning
    ) VALUES (
        p_user_id,
        p_trend_title,
        p_original_link,
        p_prediction_type,
        v_due_date,
        p_confidence,
        p_reasoning
    ) RETURNING id INTO v_prediction_id;
    
    -- Award XP for making prediction
    PERFORM award_xp(
        p_user_id,
        10,
        'spike_prediction',
        'Made a spike prediction: ' || p_trend_title
    );
    
    -- Update user stats
    UPDATE predictor_stats
    SET 
        total_predictions = total_predictions + 1,
        pending_predictions = pending_predictions + 1,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Create stats entry if doesn't exist
    INSERT INTO predictor_stats (user_id, total_predictions, pending_predictions)
    VALUES (p_user_id, 1, 1)
    ON CONFLICT (user_id) DO NOTHING;
    
    RETURN v_prediction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to submit proof for a prediction
CREATE OR REPLACE FUNCTION submit_spike_proof(
    p_prediction_id UUID,
    p_user_id UUID,
    p_proof_links JSONB,
    p_total_views BIGINT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_proof_id UUID;
    v_prediction spike_predictions%ROWTYPE;
    v_link_count INTEGER;
BEGIN
    -- Get prediction details
    SELECT * INTO v_prediction FROM spike_predictions WHERE id = p_prediction_id;
    
    -- Verify prediction exists and is awaiting proof
    IF v_prediction IS NULL THEN
        RAISE EXCEPTION 'Prediction not found';
    END IF;
    
    IF v_prediction.status NOT IN ('active', 'awaiting_proof') THEN
        RAISE EXCEPTION 'Prediction not eligible for proof submission';
    END IF;
    
    -- Verify it's the original predictor
    IF v_prediction.predictor_id != p_user_id THEN
        RAISE EXCEPTION 'Only the original predictor can submit proof';
    END IF;
    
    -- Count proof links
    v_link_count := jsonb_array_length(p_proof_links);
    
    -- Create proof submission
    INSERT INTO spike_proofs (
        prediction_id,
        submitter_id,
        proof_links,
        total_new_views
    ) VALUES (
        p_prediction_id,
        p_user_id,
        p_proof_links,
        p_total_views
    ) RETURNING id INTO v_proof_id;
    
    -- Update prediction status
    UPDATE spike_predictions
    SET 
        status = 'proof_submitted',
        updated_at = NOW()
    WHERE id = p_prediction_id;
    
    -- Award XP for submitting proof
    PERFORM award_xp(
        p_user_id,
        50,
        'proof_submitted',
        'Submitted proof for prediction'
    );
    
    -- Award bonus XP for multiple proof links
    IF v_link_count > 1 THEN
        PERFORM award_xp(
            p_user_id,
            20 * (v_link_count - 1),
            'multiple_proofs',
            'Submitted ' || v_link_count || ' proof links'
        );
    END IF;
    
    RETURN v_proof_id;
END;
$$ LANGUAGE plpgsql;

-- Function to validate proof
CREATE OR REPLACE FUNCTION validate_spike_proof(
    p_proof_id UUID,
    p_validator_id UUID,
    p_vote TEXT,
    p_same_trend BOOLEAN DEFAULT false,
    p_spike_evident BOOLEAN DEFAULT false,
    p_feedback TEXT DEFAULT NULL
)
RETURNS void AS $$
DECLARE
    v_proof spike_proofs%ROWTYPE;
    v_vote_count INTEGER;
    v_valid_votes INTEGER;
    v_threshold DECIMAL := 0.7; -- 70% agreement needed
BEGIN
    -- Get proof details
    SELECT * INTO v_proof FROM spike_proofs WHERE id = p_proof_id;
    
    IF v_proof IS NULL THEN
        RAISE EXCEPTION 'Proof not found';
    END IF;
    
    -- Record validation vote
    INSERT INTO proof_validations (
        proof_id,
        validator_id,
        vote,
        same_trend_confirmed,
        spike_evident,
        proof_authentic,
        feedback
    ) VALUES (
        p_proof_id,
        p_validator_id,
        p_vote,
        p_same_trend,
        p_spike_evident,
        p_same_trend AND p_spike_evident, -- Both must be true for authentic
        p_feedback
    ) ON CONFLICT (proof_id, validator_id) DO UPDATE
    SET 
        vote = EXCLUDED.vote,
        same_trend_confirmed = EXCLUDED.same_trend_confirmed,
        spike_evident = EXCLUDED.spike_evident,
        feedback = EXCLUDED.feedback,
        voted_at = NOW();
    
    -- Award XP for validation
    PERFORM award_xp(
        p_validator_id,
        5,
        'proof_validation',
        'Validated a spike proof'
    );
    
    -- Check if we have enough votes to determine outcome
    SELECT COUNT(*), COUNT(*) FILTER (WHERE vote = 'valid')
    INTO v_vote_count, v_valid_votes
    FROM proof_validations
    WHERE proof_id = p_proof_id;
    
    -- If we have at least 5 votes, check for consensus
    IF v_vote_count >= 5 THEN
        IF v_valid_votes::DECIMAL / v_vote_count >= v_threshold THEN
            -- Proof validated!
            UPDATE spike_proofs
            SET 
                validation_status = 'validated',
                community_score = v_valid_votes::DECIMAL / v_vote_count,
                validated_at = NOW()
            WHERE id = p_proof_id;
            
            -- Update prediction status
            UPDATE spike_predictions
            SET 
                status = 'validated',
                updated_at = NOW()
            WHERE id = v_proof.prediction_id;
            
            -- Award big XP to predictor
            PERFORM award_xp(
                v_proof.submitter_id,
                100,
                'prediction_validated',
                'Spike prediction was validated by community!'
            );
            
            -- Update predictor stats
            UPDATE predictor_stats
            SET 
                successful_predictions = successful_predictions + 1,
                pending_predictions = pending_predictions - 1,
                current_success_streak = current_success_streak + 1,
                best_success_streak = GREATEST(best_success_streak, current_success_streak + 1),
                accuracy_rate = (successful_predictions + 1)::DECIMAL / (successful_predictions + failed_predictions + 1) * 100,
                updated_at = NOW()
            WHERE user_id = v_proof.submitter_id;
            
            -- Award XP bonus to validators who voted correctly
            INSERT INTO xp_transactions (user_id, amount, type, description)
            SELECT 
                validator_id,
                5,
                'correct_validation',
                'Voted with majority on validated proof'
            FROM proof_validations
            WHERE proof_id = p_proof_id AND vote = 'valid';
            
        ELSIF v_valid_votes::DECIMAL / v_vote_count < (1 - v_threshold) THEN
            -- Proof rejected
            UPDATE spike_proofs
            SET 
                validation_status = 'rejected',
                community_score = v_valid_votes::DECIMAL / v_vote_count
            WHERE id = p_proof_id;
            
            UPDATE spike_predictions
            SET 
                status = 'failed',
                updated_at = NOW()
            WHERE id = v_proof.prediction_id;
            
            -- Update predictor stats
            UPDATE predictor_stats
            SET 
                failed_predictions = failed_predictions + 1,
                pending_predictions = pending_predictions - 1,
                current_success_streak = 0,
                accuracy_rate = successful_predictions::DECIMAL / (successful_predictions + failed_predictions + 1) * 100,
                updated_at = NOW()
            WHERE user_id = v_proof.submitter_id;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Scheduled function to check for expired predictions
CREATE OR REPLACE FUNCTION check_expired_predictions()
RETURNS void AS $$
BEGIN
    -- Mark predictions as awaiting proof when due date arrives
    UPDATE spike_predictions
    SET 
        status = 'awaiting_proof',
        updated_at = NOW()
    WHERE 
        status = 'active' 
        AND prediction_due_at <= NOW();
    
    -- Expire predictions that haven't received proof within 24 hours of due date
    UPDATE spike_predictions
    SET 
        status = 'expired',
        updated_at = NOW()
    WHERE 
        status = 'awaiting_proof'
        AND prediction_due_at < NOW() - INTERVAL '24 hours';
    
    -- Update stats for expired predictions
    UPDATE predictor_stats ps
    SET 
        failed_predictions = failed_predictions + 1,
        pending_predictions = pending_predictions - 1,
        current_success_streak = 0,
        accuracy_rate = successful_predictions::DECIMAL / (successful_predictions + failed_predictions + 1) * 100,
        updated_at = NOW()
    FROM spike_predictions sp
    WHERE 
        sp.predictor_id = ps.user_id
        AND sp.status = 'expired'
        AND sp.updated_at > NOW() - INTERVAL '1 minute'; -- Only just expired
END;
$$ LANGUAGE plpgsql;

-- 8. Views for leaderboards and analytics

-- Top predictors leaderboard
CREATE OR REPLACE VIEW top_predictors AS
SELECT 
    ps.user_id,
    p.username,
    p.avatar_url,
    ps.predictor_title,
    ps.predictor_level,
    ps.successful_predictions,
    ps.total_predictions,
    ps.accuracy_rate,
    ps.best_prediction_multiplier,
    ps.current_success_streak,
    ps.reputation_score,
    ps.total_prediction_xp,
    RANK() OVER (ORDER BY ps.reputation_score DESC) as predictor_rank
FROM predictor_stats ps
JOIN profiles p ON ps.user_id = p.id
WHERE ps.total_predictions >= 3 -- Minimum predictions to qualify
ORDER BY ps.reputation_score DESC;

-- Active predictions view
CREATE OR REPLACE VIEW active_predictions_view AS
SELECT 
    sp.*,
    p.username as predictor_name,
    p.avatar_url as predictor_avatar,
    ps.predictor_title,
    ps.accuracy_rate,
    CASE 
        WHEN sp.prediction_due_at > NOW() THEN 
            EXTRACT(EPOCH FROM (sp.prediction_due_at - NOW()))::INTEGER
        ELSE 0
    END as seconds_remaining
FROM spike_predictions sp
JOIN profiles p ON sp.predictor_id = p.id
LEFT JOIN predictor_stats ps ON sp.predictor_id = ps.user_id
WHERE sp.status IN ('active', 'awaiting_proof', 'proof_submitted')
ORDER BY sp.prediction_due_at ASC;

-- 9. Indexes for performance
CREATE INDEX idx_predictions_status ON spike_predictions(status) WHERE status IN ('active', 'awaiting_proof');
CREATE INDEX idx_predictions_due ON spike_predictions(prediction_due_at) WHERE status = 'active';
CREATE INDEX idx_proofs_validation ON spike_proofs(validation_status);
CREATE INDEX idx_validations_proof ON proof_validations(proof_id);
CREATE INDEX idx_predictor_stats_user ON predictor_stats(user_id);
CREATE INDEX idx_predictor_stats_rank ON predictor_stats(reputation_score DESC);

-- 10. RLS Policies
ALTER TABLE spike_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE spike_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE proof_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictor_stats ENABLE ROW LEVEL SECURITY;

-- Anyone can view predictions
CREATE POLICY "Public can view predictions" ON spike_predictions
    FOR SELECT USING (true);

-- Users can create their own predictions
CREATE POLICY "Users can create predictions" ON spike_predictions
    FOR INSERT WITH CHECK (auth.uid() = predictor_id);

-- Users can update their own predictions
CREATE POLICY "Users can update own predictions" ON spike_predictions
    FOR UPDATE USING (auth.uid() = predictor_id);

-- Anyone can view proofs
CREATE POLICY "Public can view proofs" ON spike_proofs
    FOR SELECT USING (true);

-- Predictors can submit proof for their predictions
CREATE POLICY "Predictors can submit proof" ON spike_proofs
    FOR INSERT WITH CHECK (
        auth.uid() = submitter_id 
        AND submitter_id = (SELECT predictor_id FROM spike_predictions WHERE id = prediction_id)
    );

-- Anyone can validate proofs
CREATE POLICY "Anyone can validate proofs" ON proof_validations
    FOR ALL USING (auth.uid() = validator_id);

-- Users can view their own stats
CREATE POLICY "Users view own predictor stats" ON predictor_stats
    FOR SELECT USING (true); -- Public leaderboard

-- System can update stats
CREATE POLICY "System updates predictor stats" ON predictor_stats
    FOR ALL USING (auth.uid() = user_id);