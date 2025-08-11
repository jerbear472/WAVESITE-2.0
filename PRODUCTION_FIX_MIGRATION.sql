-- ============================================
-- PRODUCTION FIX MIGRATION
-- Fixes all critical issues for production readiness
-- Version: 2.0.0
-- Date: 2025-01-11
-- ============================================

-- ============================================
-- STEP 1: Clean up duplicate tables
-- ============================================

-- Check if profiles table exists and migrate data to user_profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        -- Migrate any missing data from profiles to user_profiles
        INSERT INTO user_profiles (
            id, username, email, role, spotter_tier,
            earnings_pending, earnings_approved, earnings_paid, total_earnings,
            trends_spotted, accuracy_score, validation_score, current_streak,
            demographics, interests, created_at, updated_at, is_active
        )
        SELECT 
            p.id, 
            COALESCE(p.username, p.email, 'user_' || LEFT(p.id::text, 8)),
            COALESCE(p.email, au.email),
            COALESCE(p.role, 'participant')::user_role,
            COALESCE(p.spotter_tier, 'learning')::spotter_tier,
            COALESCE(p.earnings_pending, 0.00),
            COALESCE(p.earnings_approved, 0.00),
            COALESCE(p.earnings_paid, 0.00),
            COALESCE(p.total_earnings, 0.00),
            COALESCE(p.trends_spotted, 0),
            COALESCE(p.accuracy_score, 0.00),
            COALESCE(p.validation_score, 0.00),
            COALESCE(p.current_streak, 0),
            COALESCE(p.demographics, '{}'),
            COALESCE(p.interests, '{}'),
            COALESCE(p.created_at, NOW()),
            COALESCE(p.updated_at, NOW()),
            COALESCE(p.is_active, true)
        FROM profiles p
        LEFT JOIN auth.users au ON au.id = p.id
        WHERE NOT EXISTS (
            SELECT 1 FROM user_profiles up WHERE up.id = p.id
        );
        
        -- Drop the old profiles table
        DROP TABLE IF EXISTS profiles CASCADE;
        RAISE NOTICE 'Migrated and dropped profiles table';
    END IF;
END $$;

-- ============================================
-- STEP 2: Fix trend_submissions table
-- ============================================

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add earnings tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'base_amount') THEN
        ALTER TABLE trend_submissions ADD COLUMN base_amount DECIMAL(10,2) DEFAULT 1.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'bonus_amount') THEN
        ALTER TABLE trend_submissions ADD COLUMN bonus_amount DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'total_earned') THEN
        ALTER TABLE trend_submissions ADD COLUMN total_earned DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'earning_status') THEN
        ALTER TABLE trend_submissions ADD COLUMN earning_status earning_status DEFAULT 'pending';
    END IF;
    
    -- Add validation tracking columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'validation_threshold') THEN
        ALTER TABLE trend_submissions ADD COLUMN validation_threshold INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'validation_deadline') THEN
        ALTER TABLE trend_submissions ADD COLUMN validation_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours');
    END IF;
END $$;

-- ============================================
-- STEP 3: Create reliable submission function
-- ============================================

CREATE OR REPLACE FUNCTION submit_trend_with_earnings(
    p_spotter_id UUID,
    p_category trend_category,
    p_description TEXT,
    p_screenshot_url TEXT DEFAULT NULL,
    p_platform TEXT DEFAULT 'other',
    p_post_url TEXT DEFAULT NULL,
    p_evidence JSONB DEFAULT '{}',
    p_quality_score DECIMAL(5,2) DEFAULT 0.50
) RETURNS UUID AS $$
DECLARE
    v_trend_id UUID;
    v_base_amount DECIMAL(10,2) := 1.00;
    v_bonus_amount DECIMAL(10,2) := 0.00;
    v_total_earned DECIMAL(10,2);
    v_spotter_tier spotter_tier;
    v_tier_multiplier DECIMAL(3,2);
BEGIN
    -- Get spotter tier
    SELECT spotter_tier INTO v_spotter_tier
    FROM user_profiles
    WHERE id = p_spotter_id;
    
    -- Calculate tier multiplier
    v_tier_multiplier := CASE v_spotter_tier
        WHEN 'elite' THEN 1.50
        WHEN 'verified' THEN 1.00
        WHEN 'learning' THEN 0.70
        WHEN 'restricted' THEN 0.30
        ELSE 0.70
    END;
    
    -- Calculate bonuses
    -- Screenshot bonus
    IF p_screenshot_url IS NOT NULL THEN
        v_bonus_amount := v_bonus_amount + 0.15;
    END IF;
    
    -- Platform bonus
    IF p_platform != 'other' THEN
        v_bonus_amount := v_bonus_amount + 0.05;
    END IF;
    
    -- Quality bonus based on description length
    IF LENGTH(p_description) > 50 THEN
        v_bonus_amount := v_bonus_amount + 0.10;
    END IF;
    
    -- Rich evidence bonus
    IF p_evidence IS NOT NULL AND jsonb_typeof(p_evidence) = 'object' THEN
        IF p_evidence ? 'hashtags' AND jsonb_array_length(p_evidence->'hashtags') > 2 THEN
            v_bonus_amount := v_bonus_amount + 0.05;
        END IF;
        IF p_evidence ? 'creator_handle' THEN
            v_bonus_amount := v_bonus_amount + 0.05;
        END IF;
    END IF;
    
    -- Calculate total with cap
    v_total_earned := LEAST((v_base_amount + v_bonus_amount) * v_tier_multiplier, 3.00);
    
    -- Insert trend
    INSERT INTO trend_submissions (
        spotter_id, category, description, screenshot_url, platform,
        post_url, evidence, quality_score, status,
        base_amount, bonus_amount, total_earned, earning_status,
        validation_count, approve_count, reject_count,
        created_at, updated_at
    ) VALUES (
        p_spotter_id, p_category, p_description, p_screenshot_url, p_platform,
        p_post_url, p_evidence, p_quality_score, 'submitted',
        v_base_amount, v_bonus_amount, v_total_earned, 'pending',
        0, 0, 0,
        NOW(), NOW()
    ) RETURNING id INTO v_trend_id;
    
    -- Update user earnings
    UPDATE user_profiles
    SET 
        earnings_pending = earnings_pending + v_total_earned,
        trends_spotted = trends_spotted + 1,
        last_submission_at = NOW(),
        updated_at = NOW()
    WHERE id = p_spotter_id;
    
    -- Update daily earnings
    UPDATE user_profiles
    SET 
        daily_earnings = CASE 
            WHEN daily_earnings_date = CURRENT_DATE 
            THEN daily_earnings + v_total_earned
            ELSE v_total_earned
        END,
        daily_earnings_date = CURRENT_DATE
    WHERE id = p_spotter_id;
    
    RETURN v_trend_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 4: Create reliable validation function
-- ============================================

CREATE OR REPLACE FUNCTION cast_trend_vote(
    p_trend_id UUID,
    p_validator_id UUID,
    p_vote BOOLEAN,
    p_quality_score DECIMAL(5,2) DEFAULT NULL,
    p_feedback TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_spotter_id UUID;
    v_validation_count INTEGER;
    v_approve_count INTEGER;
    v_reject_count INTEGER;
    v_validation_threshold INTEGER;
    v_trend_status trend_status;
    v_validator_earning DECIMAL(10,2) := 0.10;
    v_approval_bonus DECIMAL(10,2) := 0.50;
    v_result JSONB;
BEGIN
    -- Check if already voted
    IF EXISTS (
        SELECT 1 FROM trend_validations 
        WHERE trend_id = p_trend_id AND validator_id = p_validator_id
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Already voted on this trend'
        );
    END IF;
    
    -- Get trend info
    SELECT spotter_id, validation_count, approve_count, reject_count, 
           validation_threshold, status
    INTO v_spotter_id, v_validation_count, v_approve_count, v_reject_count,
         v_validation_threshold, v_trend_status
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if trend exists and is validating
    IF v_spotter_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    IF v_trend_status NOT IN ('submitted', 'validating') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend is not open for validation'
        );
    END IF;
    
    -- Prevent self-validation
    IF v_spotter_id = p_validator_id THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot validate your own trend'
        );
    END IF;
    
    -- Insert validation
    INSERT INTO trend_validations (
        trend_id, validator_id, vote, quality_score, feedback, created_at
    ) VALUES (
        p_trend_id, p_validator_id, p_vote, p_quality_score, p_feedback, NOW()
    );
    
    -- Update counts
    IF p_vote THEN
        v_approve_count := v_approve_count + 1;
    ELSE
        v_reject_count := v_reject_count + 1;
    END IF;
    v_validation_count := v_validation_count + 1;
    
    -- Check if threshold reached
    IF v_validation_count >= v_validation_threshold THEN
        IF v_approve_count > v_reject_count THEN
            v_trend_status := 'approved';
            
            -- Pay approval bonus to spotter
            UPDATE user_profiles
            SET 
                earnings_pending = earnings_pending + v_approval_bonus,
                accuracy_score = LEAST(accuracy_score + 1, 100),
                updated_at = NOW()
            WHERE id = v_spotter_id;
            
            -- Move trend earnings from pending to approved
            UPDATE trend_submissions
            SET earning_status = 'approved'
            WHERE id = p_trend_id;
            
            UPDATE user_profiles
            SET 
                earnings_approved = earnings_approved + (
                    SELECT total_earned FROM trend_submissions WHERE id = p_trend_id
                ),
                earnings_pending = earnings_pending - (
                    SELECT total_earned FROM trend_submissions WHERE id = p_trend_id
                )
            WHERE id = v_spotter_id;
        ELSE
            v_trend_status := 'rejected';
            
            -- Deduct accuracy score for rejection
            UPDATE user_profiles
            SET 
                accuracy_score = GREATEST(accuracy_score - 2, 0),
                updated_at = NOW()
            WHERE id = v_spotter_id;
        END IF;
    ELSE
        v_trend_status := 'validating';
    END IF;
    
    -- Update trend
    UPDATE trend_submissions
    SET 
        validation_count = v_validation_count,
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        status = v_trend_status,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Pay validator
    UPDATE user_profiles
    SET 
        earnings_pending = earnings_pending + v_validator_earning,
        validation_score = LEAST(validation_score + 0.5, 100),
        updated_at = NOW()
    WHERE id = p_validator_id;
    
    -- Update validator daily earnings
    UPDATE user_profiles
    SET 
        daily_earnings = CASE 
            WHEN daily_earnings_date = CURRENT_DATE 
            THEN daily_earnings + v_validator_earning
            ELSE v_validator_earning
        END,
        daily_earnings_date = CURRENT_DATE
    WHERE id = p_validator_id;
    
    -- Build result
    v_result := jsonb_build_object(
        'success', true,
        'trend_status', v_trend_status,
        'validation_count', v_validation_count,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'validator_earned', v_validator_earning,
        'approval_bonus', CASE WHEN v_trend_status = 'approved' THEN v_approval_bonus ELSE 0 END
    );
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 5: Create earnings ledger for tracking
-- ============================================

CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('submission', 'validation', 'approval_bonus', 'streak_bonus', 'cashout')),
    status earning_status DEFAULT 'pending',
    reference_id UUID, -- trend_id or validation_id
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create index for fast queries
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON earnings_ledger(created_at);

-- ============================================
-- STEP 6: Add trigger to track earnings
-- ============================================

CREATE OR REPLACE FUNCTION track_earnings_ledger() RETURNS TRIGGER AS $$
BEGIN
    IF TG_TABLE_NAME = 'trend_submissions' AND TG_OP = 'INSERT' THEN
        INSERT INTO earnings_ledger (
            user_id, amount, type, status, reference_id, description
        ) VALUES (
            NEW.spotter_id, 
            NEW.total_earned, 
            'submission',
            NEW.earning_status,
            NEW.id,
            'Trend submission: ' || LEFT(NEW.description, 50)
        );
    END IF;
    
    IF TG_TABLE_NAME = 'trend_validations' AND TG_OP = 'INSERT' THEN
        INSERT INTO earnings_ledger (
            user_id, amount, type, status, reference_id, description
        ) VALUES (
            NEW.validator_id,
            0.10,
            'validation',
            'pending',
            NEW.trend_id,
            'Validation vote cast'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS track_submission_earnings ON trend_submissions;
DROP TRIGGER IF EXISTS track_validation_earnings ON trend_validations;

-- Create new triggers
CREATE TRIGGER track_submission_earnings
    AFTER INSERT ON trend_submissions
    FOR EACH ROW EXECUTE FUNCTION track_earnings_ledger();

CREATE TRIGGER track_validation_earnings
    AFTER INSERT ON trend_validations
    FOR EACH ROW EXECUTE FUNCTION track_earnings_ledger();

-- ============================================
-- STEP 7: Fix RLS policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Public profiles are viewable" ON user_profiles;

DROP POLICY IF EXISTS "Anyone can view trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can submit trends" ON trend_submissions;
DROP POLICY IF EXISTS "Users can update own trends" ON trend_submissions;

DROP POLICY IF EXISTS "Users can view validations" ON trend_validations;
DROP POLICY IF EXISTS "Users can create validations" ON trend_validations;

DROP POLICY IF EXISTS "Users can view own earnings" ON earnings_ledger;

-- Create new policies
-- User profiles
CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Public profiles are viewable"
    ON user_profiles FOR SELECT
    USING (true);

-- Trend submissions
CREATE POLICY "Anyone can view trends"
    ON trend_submissions FOR SELECT
    USING (true);

CREATE POLICY "Users can submit trends"
    ON trend_submissions FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update own trends"
    ON trend_submissions FOR UPDATE
    USING (auth.uid() = spotter_id);

-- Trend validations
CREATE POLICY "Users can view validations"
    ON trend_validations FOR SELECT
    USING (true);

CREATE POLICY "Users can create validations"
    ON trend_validations FOR INSERT
    WITH CHECK (auth.uid() = validator_id);

-- Earnings ledger
CREATE POLICY "Users can view own earnings"
    ON earnings_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 8: Create helper functions
-- ============================================

-- Function to get user earnings summary
CREATE OR REPLACE FUNCTION get_user_earnings_summary(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'earnings_pending', earnings_pending,
        'earnings_approved', earnings_approved,
        'earnings_paid', earnings_paid,
        'total_earnings', total_earnings,
        'daily_earnings', daily_earnings,
        'daily_earnings_date', daily_earnings_date,
        'trends_spotted', trends_spotted,
        'accuracy_score', accuracy_score,
        'validation_score', validation_score,
        'spotter_tier', spotter_tier
    ) INTO v_result
    FROM user_profiles
    WHERE id = p_user_id;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get trends for validation
CREATE OR REPLACE FUNCTION get_trends_for_validation(p_validator_id UUID, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    category trend_category,
    description TEXT,
    screenshot_url TEXT,
    platform TEXT,
    created_at TIMESTAMPTZ,
    validation_count INTEGER,
    approve_count INTEGER,
    reject_count INTEGER,
    spotter_username TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ts.id,
        ts.category,
        ts.description,
        ts.screenshot_url,
        ts.platform,
        ts.created_at,
        ts.validation_count,
        ts.approve_count,
        ts.reject_count,
        up.username as spotter_username
    FROM trend_submissions ts
    JOIN user_profiles up ON up.id = ts.spotter_id
    WHERE ts.status IN ('submitted', 'validating')
    AND ts.spotter_id != p_validator_id
    AND NOT EXISTS (
        SELECT 1 FROM trend_validations tv
        WHERE tv.trend_id = ts.id AND tv.validator_id = p_validator_id
    )
    AND ts.validation_deadline > NOW()
    ORDER BY ts.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 9: Clean up old/broken functions
-- ============================================

DROP FUNCTION IF EXISTS submit_trend CASCADE;
DROP FUNCTION IF EXISTS validate_trend CASCADE;
DROP FUNCTION IF EXISTS calculate_earnings CASCADE;
DROP FUNCTION IF EXISTS update_earnings CASCADE;

-- ============================================
-- STEP 10: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ Migration completed successfully!';
    RAISE NOTICE '📊 Tables configured: user_profiles, trend_submissions, trend_validations, earnings_ledger';
    RAISE NOTICE '🔧 Functions created: submit_trend_with_earnings, cast_trend_vote, get_user_earnings_summary';
    RAISE NOTICE '🔒 RLS policies applied';
    RAISE NOTICE '⚡ Indexes created for performance';
END $$;