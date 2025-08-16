-- =====================================================
-- FIX EARNINGS SYSTEM - COMPREHENSIVE SOLUTION
-- =====================================================
-- This fixes the earnings system to work properly with
-- trend_submissions table and ensures pending earnings
-- are correctly tracked and displayed
-- =====================================================

-- First, check what tables exist
DO $$
BEGIN
    RAISE NOTICE 'Checking existing tables...';
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'trend_submissions') THEN
        RAISE NOTICE '✅ trend_submissions table exists';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'earnings_ledger') THEN
        RAISE NOTICE '✅ earnings_ledger table exists';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        RAISE NOTICE '✅ user_profiles table exists';
    END IF;
END $$;

-- =====================================================
-- ENSURE EARNINGS_LEDGER TABLE EXISTS WITH CORRECT COLUMNS
-- =====================================================
CREATE TABLE IF NOT EXISTS earnings_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL, -- 'trend_submission', 'validation', 'bonus', etc.
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid', 'rejected'
    description TEXT,
    reference_id UUID, -- ID of the related record (trend, validation, etc.)
    reference_type TEXT, -- 'trend_submissions', 'trend_validations', etc.
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON earnings_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_reference ON earnings_ledger(reference_id, reference_type);

-- Add trend_id column if it doesn't exist (for backward compatibility)
ALTER TABLE earnings_ledger 
ADD COLUMN IF NOT EXISTS trend_id UUID;

-- =====================================================
-- ENSURE USER_PROFILES TABLE HAS EARNING COLUMNS
-- =====================================================
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS pending_earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS today_earned DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS performance_tier TEXT DEFAULT 'learning',
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active TIMESTAMPTZ DEFAULT NOW();

-- =====================================================
-- ENSURE TREND_SUBMISSIONS TABLE HAS EARNING COLUMNS
-- =====================================================
ALTER TABLE trend_submissions
ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 0.25,
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS streak_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS session_multiplier DECIMAL(3,2) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS earnings_status TEXT DEFAULT 'pending';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Calculate tier multiplier
CREATE OR REPLACE FUNCTION get_tier_multiplier(p_tier TEXT)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE p_tier
        WHEN 'master' THEN 3.0
        WHEN 'elite' THEN 2.0
        WHEN 'verified' THEN 1.5
        WHEN 'learning' THEN 1.0
        WHEN 'restricted' THEN 0.5
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate streak multiplier (daily streak)
CREATE OR REPLACE FUNCTION get_streak_multiplier(p_streak INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_streak >= 30 THEN 2.5
        WHEN p_streak >= 14 THEN 2.0
        WHEN p_streak >= 7 THEN 1.5
        WHEN p_streak >= 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Calculate session streak multiplier (within session)
CREATE OR REPLACE FUNCTION get_session_streak_multiplier(p_position INTEGER)
RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE
        WHEN p_position >= 5 THEN 2.5
        WHEN p_position = 4 THEN 2.0
        WHEN p_position = 3 THEN 1.5
        WHEN p_position = 2 THEN 1.2
        ELSE 1.0
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- MAIN TRIGGER FUNCTION FOR TREND_SUBMISSIONS
-- =====================================================
CREATE OR REPLACE FUNCTION handle_trend_submission_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2);
    v_tier_multiplier DECIMAL(3,2);
    v_streak_multiplier DECIMAL(3,2);
    v_session_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
    v_user_streak INTEGER;
    v_session_position INTEGER;
    v_description TEXT;
    v_payment_from_evidence DECIMAL(10,2);
BEGIN
    -- Check if payment amount was provided in evidence
    v_payment_from_evidence := NULL;
    IF NEW.evidence IS NOT NULL AND NEW.evidence ? 'payment_amount' THEN
        v_payment_from_evidence := (NEW.evidence->>'payment_amount')::DECIMAL(10,2);
    END IF;
    
    -- Use provided payment or calculate base amount
    v_base_amount := COALESCE(v_payment_from_evidence, NEW.base_amount, 0.25);
    
    -- Get user profile data
    SELECT 
        COALESCE(performance_tier, 'learning'),
        COALESCE(current_streak, 0)
    INTO v_user_tier, v_user_streak
    FROM user_profiles 
    WHERE user_id = NEW.spotter_id;
    
    -- If no profile exists, create one
    IF v_user_tier IS NULL THEN
        INSERT INTO user_profiles (user_id, performance_tier, current_streak)
        VALUES (NEW.spotter_id, 'learning', 0)
        ON CONFLICT (user_id) DO UPDATE
        SET last_active = NOW();
        
        v_user_tier := 'learning';
        v_user_streak := 0;
    END IF;
    
    -- Get session position from evidence if available
    v_session_position := 1;
    IF NEW.evidence IS NOT NULL AND NEW.evidence ? 'streak_count' THEN
        v_session_position := COALESCE((NEW.evidence->>'streak_count')::INTEGER, 1);
    END IF;
    
    -- Calculate multipliers
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    v_streak_multiplier := get_streak_multiplier(v_user_streak);
    v_session_multiplier := get_session_streak_multiplier(v_session_position);
    
    -- If payment was provided, use it directly (already calculated with multipliers)
    IF v_payment_from_evidence IS NOT NULL THEN
        v_final_amount := v_payment_from_evidence;
    ELSE
        -- Calculate final amount with all multipliers
        v_final_amount := ROUND(v_base_amount * v_tier_multiplier * v_streak_multiplier * v_session_multiplier, 2);
    END IF;
    
    -- Ensure minimum amount
    IF v_final_amount < 0.25 THEN
        v_final_amount := 0.25;
    END IF;
    
    -- Set the earnings fields on the trend
    NEW.earnings := v_final_amount;
    NEW.base_amount := v_base_amount;
    NEW.tier_multiplier := v_tier_multiplier;
    NEW.streak_multiplier := v_streak_multiplier;
    NEW.session_multiplier := v_session_multiplier;
    NEW.earnings_status := 'pending';
    
    -- Build description
    v_description := format(
        'Trend: %s - Base: $%s × %s tier (%sx) × %s day streak (%sx) × session #%s (%sx) = $%s',
        COALESCE(NEW.description, 'Untitled'),
        v_base_amount,
        v_user_tier,
        v_tier_multiplier,
        v_user_streak,
        v_streak_multiplier,
        v_session_position,
        v_session_multiplier,
        v_final_amount
    );
    
    -- Insert into earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type,
        trend_id,  -- Also set trend_id for compatibility
        metadata
    ) VALUES (
        NEW.spotter_id,
        v_final_amount,
        'trend_submission',
        'pending',
        v_description,
        NEW.id,
        'trend_submissions',
        NEW.id,  -- Set trend_id
        jsonb_build_object(
            'base_amount', v_base_amount,
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'streak', v_user_streak,
            'streak_multiplier', v_streak_multiplier,
            'session_position', v_session_position,
            'session_multiplier', v_session_multiplier,
            'trend_name', COALESCE(NEW.description, 'Untitled'),
            'category', NEW.category,
            'platform', NEW.platform
        )
    );
    
    -- Update user profile earnings
    UPDATE user_profiles
    SET 
        pending_earnings = COALESCE(pending_earnings, 0) + v_final_amount,
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        last_active = NOW()
    WHERE user_id = NEW.spotter_id;
    
    -- Log the earnings calculation
    RAISE NOTICE 'Earnings calculated for trend %: $% (base: $%, tier: %×%, streak: %×%, session: %×%)',
        NEW.id, v_final_amount, v_base_amount, v_user_tier, v_tier_multiplier, 
        v_user_streak, v_streak_multiplier, v_session_position, v_session_multiplier;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FOR TREND STATUS UPDATES
-- =====================================================
CREATE OR REPLACE FUNCTION handle_trend_status_update()
RETURNS TRIGGER AS $$
BEGIN
    -- When trend status changes, update earnings ledger
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Update earnings status based on trend status
        IF NEW.status = 'approved' THEN
            UPDATE earnings_ledger
            SET 
                status = 'approved',
                updated_at = NOW()
            WHERE reference_id = NEW.id 
            AND reference_type = 'trend_submissions'
            AND status = 'pending';
            
            -- Move from pending to approved earnings in user profile
            UPDATE user_profiles
            SET 
                pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - COALESCE(NEW.earnings, 0))
            WHERE user_id = NEW.spotter_id;
            
        ELSIF NEW.status = 'rejected' THEN
            UPDATE earnings_ledger
            SET 
                status = 'rejected',
                updated_at = NOW()
            WHERE reference_id = NEW.id 
            AND reference_type = 'trend_submissions'
            AND status = 'pending';
            
            -- Remove from pending earnings
            UPDATE user_profiles
            SET 
                pending_earnings = GREATEST(0, COALESCE(pending_earnings, 0) - COALESCE(NEW.earnings, 0)),
                total_earned = GREATEST(0, COALESCE(total_earned, 0) - COALESCE(NEW.earnings, 0))
            WHERE user_id = NEW.spotter_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SET UP TRIGGERS
-- =====================================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS calculate_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS handle_trend_submission_earnings_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS update_trend_status_earnings_trigger ON trend_submissions;

-- Create trigger for new trend submissions
CREATE TRIGGER handle_trend_submission_earnings_trigger
    BEFORE INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_submission_earnings();

-- Create trigger for trend status updates
CREATE TRIGGER update_trend_status_earnings_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_status_update();

-- =====================================================
-- VALIDATION EARNINGS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION handle_validation_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_base_amount DECIMAL(10,2) := 0.01; -- $0.01 per validation
    v_tier_multiplier DECIMAL(3,2);
    v_final_amount DECIMAL(10,2);
    v_user_tier TEXT;
BEGIN
    -- Get validator tier
    SELECT COALESCE(performance_tier, 'learning')
    INTO v_user_tier
    FROM user_profiles 
    WHERE user_id = NEW.validator_id;
    
    -- Calculate tier multiplier
    v_tier_multiplier := get_tier_multiplier(v_user_tier);
    
    -- Calculate final amount
    v_final_amount := ROUND(v_base_amount * v_tier_multiplier, 2);
    
    -- Insert into earnings ledger
    INSERT INTO earnings_ledger (
        user_id,
        amount,
        type,
        status,
        description,
        reference_id,
        reference_type,
        metadata
    ) VALUES (
        NEW.validator_id,
        v_final_amount,
        'validation',
        'approved', -- Validations are immediately approved
        format('Validation vote - $%s × %s tier (%sx)', v_base_amount, v_user_tier, v_tier_multiplier),
        NEW.id,
        'trend_validations',
        jsonb_build_object(
            'base_amount', v_base_amount,
            'tier', v_user_tier,
            'tier_multiplier', v_tier_multiplier,
            'trend_id', NEW.trend_id,
            'vote', NEW.vote
        )
    );
    
    -- Update user earnings
    UPDATE user_profiles
    SET 
        total_earned = COALESCE(total_earned, 0) + v_final_amount,
        today_earned = CASE 
            WHEN DATE(last_active) = CURRENT_DATE 
            THEN COALESCE(today_earned, 0) + v_final_amount
            ELSE v_final_amount
        END,
        last_active = NOW()
    WHERE user_id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Set up validation trigger
DROP TRIGGER IF EXISTS handle_validation_earnings_trigger ON trend_validations;
CREATE TRIGGER handle_validation_earnings_trigger
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION handle_validation_earnings();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT SELECT, INSERT, UPDATE ON earnings_ledger TO authenticated;
GRANT SELECT ON earnings_ledger TO anon;
GRANT SELECT, UPDATE ON user_profiles TO authenticated;

-- =====================================================
-- FIX EXISTING DATA
-- =====================================================

-- Recalculate pending earnings for all users based on earnings_ledger
UPDATE user_profiles up
SET pending_earnings = (
    SELECT COALESCE(SUM(amount), 0)
    FROM earnings_ledger el
    WHERE el.user_id = up.user_id
    AND el.status = 'pending'
);

-- Ensure all recent trend_submissions have earnings entries
INSERT INTO earnings_ledger (
    user_id,
    amount,
    type,
    status,
    description,
    reference_id,
    reference_type,
    trend_id,
    metadata
)
SELECT 
    ts.spotter_id,
    COALESCE(ts.earnings, 0.25),
    'trend_submission',
    CASE 
        WHEN ts.status = 'approved' THEN 'approved'
        WHEN ts.status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END,
    format('Trend: %s - Retroactive entry', COALESCE(ts.description, 'Untitled')),
    ts.id,
    'trend_submissions',
    ts.id,
    jsonb_build_object(
        'retroactive', true,
        'original_status', ts.status,
        'created_at', ts.created_at
    )
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id AND el.reference_type = 'trend_submissions'
WHERE el.id IS NULL
AND ts.created_at > NOW() - INTERVAL '7 days';

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Check triggers
    SELECT COUNT(*) INTO v_count
    FROM information_schema.triggers 
    WHERE trigger_name = 'handle_trend_submission_earnings_trigger';
    
    IF v_count > 0 THEN
        RAISE NOTICE '✅ Trend submission earnings trigger is active';
    ELSE
        RAISE WARNING '❌ Trend submission earnings trigger is missing!';
    END IF;
    
    -- Check recent earnings
    SELECT COUNT(*) INTO v_count
    FROM earnings_ledger
    WHERE created_at > NOW() - INTERVAL '1 day';
    
    RAISE NOTICE '📊 Earnings entries in last 24 hours: %', v_count;
    
    -- Check pending earnings
    SELECT COUNT(*) INTO v_count
    FROM earnings_ledger
    WHERE status = 'pending';
    
    RAISE NOTICE '⏳ Pending earnings entries: %', v_count;
END $$;

-- =====================================================
-- SUMMARY
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ EARNINGS SYSTEM FIX COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE '📊 Base rate: $0.25 per trend submission';
    RAISE NOTICE '🎯 Multipliers: Tier × Daily Streak × Session Position';
    RAISE NOTICE '💰 Earnings tracked in earnings_ledger table';
    RAISE NOTICE '⚡ Triggers active on trend_submissions table';
    RAISE NOTICE '🔄 Status updates automatically sync earnings';
    RAISE NOTICE '========================================';
END $$;