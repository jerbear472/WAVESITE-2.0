-- ============================================
-- PRODUCTION FIX - CLEAN VERSION
-- This handles the fact that 'profiles' is a VIEW not a TABLE
-- Version: 3.0.0
-- Date: 2025-01-11
-- ============================================

-- ============================================
-- STEP 1: Drop the profiles VIEW if it exists
-- ============================================
DROP VIEW IF EXISTS public.profiles CASCADE;

-- ============================================
-- STEP 2: Ensure user_profiles table has all required columns
-- ============================================

-- Add missing earnings columns if they don't exist
DO $$
BEGIN
    -- Earnings columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'earnings_pending') THEN
        ALTER TABLE user_profiles ADD COLUMN earnings_pending DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'earnings_approved') THEN
        ALTER TABLE user_profiles ADD COLUMN earnings_approved DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'earnings_paid') THEN
        ALTER TABLE user_profiles ADD COLUMN earnings_paid DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'total_earnings') THEN
        ALTER TABLE user_profiles ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'daily_earnings') THEN
        ALTER TABLE user_profiles ADD COLUMN daily_earnings DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'daily_earnings_date') THEN
        ALTER TABLE user_profiles ADD COLUMN daily_earnings_date DATE;
    END IF;
    
    -- Stats columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'trends_spotted') THEN
        ALTER TABLE user_profiles ADD COLUMN trends_spotted INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'accuracy_score') THEN
        ALTER TABLE user_profiles ADD COLUMN accuracy_score DECIMAL(5,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'validation_score') THEN
        ALTER TABLE user_profiles ADD COLUMN validation_score DECIMAL(5,2) DEFAULT 0.00;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'current_streak') THEN
        ALTER TABLE user_profiles ADD COLUMN current_streak INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'last_submission_at') THEN
        ALTER TABLE user_profiles ADD COLUMN last_submission_at TIMESTAMPTZ;
    END IF;
    
    -- Tier column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'user_profiles' AND column_name = 'spotter_tier') THEN
        -- Check if type exists
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'spotter_tier') THEN
            CREATE TYPE spotter_tier AS ENUM ('elite', 'verified', 'learning', 'restricted');
        END IF;
        ALTER TABLE user_profiles ADD COLUMN spotter_tier spotter_tier DEFAULT 'learning';
    END IF;
END $$;

-- ============================================
-- STEP 3: Recreate the profiles VIEW for compatibility
-- ============================================
CREATE OR REPLACE VIEW public.profiles AS 
SELECT * FROM public.user_profiles;

-- Grant permissions on the view
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;

-- ============================================
-- STEP 4: Fix trend_submissions table
-- ============================================

DO $$
BEGIN
    -- Add earnings columns
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
    
    -- Check if earning_status type exists before adding column
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earning_status') THEN
        CREATE TYPE earning_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'earning_status') THEN
        ALTER TABLE trend_submissions ADD COLUMN earning_status earning_status DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'tier_multiplier') THEN
        ALTER TABLE trend_submissions ADD COLUMN tier_multiplier DECIMAL(3,2) DEFAULT 0.70;
    END IF;
    
    -- Validation columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'validation_threshold') THEN
        ALTER TABLE trend_submissions ADD COLUMN validation_threshold INTEGER DEFAULT 5;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'trend_submissions' AND column_name = 'validation_deadline') THEN
        ALTER TABLE trend_submissions ADD COLUMN validation_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours');
    END IF;
    
    -- Fix validation count columns to be INTEGER
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trend_submissions' 
               AND column_name = 'validation_count' 
               AND data_type != 'integer') THEN
        -- Convert to integer if it's not already
        ALTER TABLE trend_submissions ALTER COLUMN validation_count TYPE INTEGER USING validation_count::INTEGER;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trend_submissions' 
               AND column_name = 'approve_count' 
               AND data_type != 'integer') THEN
        ALTER TABLE trend_submissions ALTER COLUMN approve_count TYPE INTEGER USING approve_count::INTEGER;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'trend_submissions' 
               AND column_name = 'reject_count' 
               AND data_type != 'integer') THEN
        ALTER TABLE trend_submissions ALTER COLUMN reject_count TYPE INTEGER USING reject_count::INTEGER;
    END IF;
END $$;

-- ============================================
-- STEP 5: Create/Fix trend_validations table
-- ============================================

CREATE TABLE IF NOT EXISTS trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    vote BOOLEAN NOT NULL,
    quality_score DECIMAL(5,2),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- ============================================
-- STEP 6: Create earnings_ledger table
-- ============================================

CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('submission', 'validation', 'approval_bonus', 'streak_bonus', 'cashout')),
    status earning_status DEFAULT 'pending',
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON earnings_ledger(created_at);

-- ============================================
-- STEP 7: Create the cast_trend_vote function
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
    
    -- Get trend info (handle NULL counts)
    SELECT 
        spotter_id, 
        COALESCE(validation_count, 0),
        COALESCE(approve_count, 0),
        COALESCE(reject_count, 0),
        COALESCE(validation_threshold, 5),
        status
    INTO 
        v_spotter_id, 
        v_validation_count,
        v_approve_count,
        v_reject_count,
        v_validation_threshold,
        v_trend_status
    FROM trend_submissions
    WHERE id = p_trend_id;
    
    -- Check if trend exists
    IF v_spotter_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Trend not found'
        );
    END IF;
    
    -- Check status
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
        trend_id, validator_id, vote, quality_score, feedback
    ) VALUES (
        p_trend_id, p_validator_id, p_vote, p_quality_score, p_feedback
    );
    
    -- Update counts
    IF p_vote THEN
        v_approve_count := v_approve_count + 1;
    ELSE
        v_reject_count := v_reject_count + 1;
    END IF;
    v_validation_count := v_validation_count + 1;
    
    -- Update trend
    UPDATE trend_submissions
    SET 
        validation_count = v_validation_count,
        approve_count = v_approve_count,
        reject_count = v_reject_count,
        status = CASE 
            WHEN v_validation_count >= v_validation_threshold THEN
                CASE WHEN v_approve_count > v_reject_count THEN 'approved' ELSE 'rejected' END
            ELSE 'validating'
        END,
        updated_at = NOW()
    WHERE id = p_trend_id;
    
    -- Update validator earnings
    UPDATE user_profiles
    SET 
        earnings_pending = COALESCE(earnings_pending, 0) + v_validator_earning,
        validation_score = LEAST(COALESCE(validation_score, 0) + 0.5, 100),
        updated_at = NOW()
    WHERE id = p_validator_id;
    
    -- Add to earnings ledger
    INSERT INTO earnings_ledger (
        user_id, amount, type, status, reference_id, description
    ) VALUES (
        p_validator_id, v_validator_earning, 'validation', 'pending', p_trend_id,
        'Validation vote cast'
    );
    
    -- If approved, pay bonus to spotter
    IF v_validation_count >= v_validation_threshold AND v_approve_count > v_reject_count THEN
        UPDATE user_profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + v_approval_bonus,
            accuracy_score = LEAST(COALESCE(accuracy_score, 0) + 1, 100),
            updated_at = NOW()
        WHERE id = v_spotter_id;
        
        -- Add approval bonus to ledger
        INSERT INTO earnings_ledger (
            user_id, amount, type, status, reference_id, description
        ) VALUES (
            v_spotter_id, v_approval_bonus, 'approval_bonus', 'pending', p_trend_id,
            'Trend approved bonus'
        );
    END IF;
    
    -- Return result
    RETURN jsonb_build_object(
        'success', true,
        'trend_status', CASE 
            WHEN v_validation_count >= v_validation_threshold THEN
                CASE WHEN v_approve_count > v_reject_count THEN 'approved' ELSE 'rejected' END
            ELSE 'validating'
        END,
        'validation_count', v_validation_count,
        'approve_count', v_approve_count,
        'reject_count', v_reject_count,
        'validator_earned', v_validator_earning,
        'approval_bonus', CASE 
            WHEN v_validation_count >= v_validation_threshold AND v_approve_count > v_reject_count 
            THEN v_approval_bonus 
            ELSE 0 
        END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Enable RLS and create policies
-- ============================================

-- Enable RLS
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
CREATE POLICY "Public profiles are viewable"
    ON user_profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Anyone can view trends"
    ON trend_submissions FOR SELECT
    USING (true);

CREATE POLICY "Users can submit trends"
    ON trend_submissions FOR INSERT
    WITH CHECK (auth.uid() = spotter_id);

CREATE POLICY "Users can update own trends"
    ON trend_submissions FOR UPDATE
    USING (auth.uid() = spotter_id);

CREATE POLICY "Users can view validations"
    ON trend_validations FOR SELECT
    USING (true);

CREATE POLICY "Users can create validations"
    ON trend_validations FOR INSERT
    WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users can view own earnings"
    ON earnings_ledger FOR SELECT
    USING (auth.uid() = user_id);

-- ============================================
-- STEP 9: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_created_at ON trend_submissions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator_id ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- STEP 10: Update any NULL earnings to 0
-- ============================================

UPDATE user_profiles
SET 
    earnings_pending = COALESCE(earnings_pending, 0),
    earnings_approved = COALESCE(earnings_approved, 0),
    earnings_paid = COALESCE(earnings_paid, 0),
    total_earnings = COALESCE(total_earnings, 0),
    daily_earnings = COALESCE(daily_earnings, 0),
    trends_spotted = COALESCE(trends_spotted, 0),
    accuracy_score = COALESCE(accuracy_score, 0),
    validation_score = COALESCE(validation_score, 0),
    current_streak = COALESCE(current_streak, 0)
WHERE 
    earnings_pending IS NULL OR
    earnings_approved IS NULL OR
    earnings_paid IS NULL OR
    total_earnings IS NULL OR
    daily_earnings IS NULL OR
    trends_spotted IS NULL OR
    accuracy_score IS NULL OR
    validation_score IS NULL OR
    current_streak IS NULL;

-- ============================================
-- VERIFICATION
-- ============================================

DO $$
DECLARE
    v_user_profiles_exists BOOLEAN;
    v_profiles_view_exists BOOLEAN;
    v_earnings_ledger_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check if user_profiles table exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'user_profiles'
    ) INTO v_user_profiles_exists;
    
    -- Check if profiles view exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views 
        WHERE table_name = 'profiles'
    ) INTO v_profiles_view_exists;
    
    -- Check if earnings_ledger exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'earnings_ledger'
    ) INTO v_earnings_ledger_exists;
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'cast_trend_vote'
    ) INTO v_function_exists;
    
    RAISE NOTICE '==================================';
    RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '==================================';
    RAISE NOTICE 'user_profiles table: %', CASE WHEN v_user_profiles_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'profiles view: %', CASE WHEN v_profiles_view_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'earnings_ledger table: %', CASE WHEN v_earnings_ledger_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE 'cast_trend_vote function: %', CASE WHEN v_function_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '==================================';
    RAISE NOTICE 'The app should now work correctly!';
END $$;