-- ============================================
-- STEP-BY-STEP FIX FOR PRODUCTION
-- Run each section one at a time in Supabase SQL Editor
-- ============================================

-- ============================================
-- SECTION 1: Drop the profiles VIEW safely
-- ============================================
DROP VIEW IF EXISTS public.profiles CASCADE;

-- ============================================
-- SECTION 2: Add missing columns to user_profiles
-- ============================================

-- Add earnings columns if missing
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS daily_earnings DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS daily_earnings_date DATE;

-- Add stats columns if missing
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS trends_spotted INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS accuracy_score DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS validation_score DECIMAL(5,2) DEFAULT 0.00;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS last_submission_at TIMESTAMPTZ;

-- ============================================
-- SECTION 3: Recreate the profiles VIEW
-- ============================================
CREATE VIEW public.profiles AS 
SELECT * FROM public.user_profiles;

-- Grant permissions
GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO anon;

-- ============================================
-- SECTION 4: Fix trend_submissions columns
-- ============================================

-- Add earnings columns
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS base_amount DECIMAL(10,2) DEFAULT 1.00;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS bonus_amount DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS total_earned DECIMAL(10,2) DEFAULT 0.00;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS tier_multiplier DECIMAL(3,2) DEFAULT 0.70;

-- Add validation columns
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_threshold INTEGER DEFAULT 5;

ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS validation_deadline TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours');

-- ============================================
-- SECTION 5: Create earnings_ledger table
-- ============================================

-- Create earning_status type if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'earning_status') THEN
        CREATE TYPE earning_status AS ENUM ('pending', 'approved', 'paid', 'cancelled');
    END IF;
END $$;

-- Create the earnings ledger table
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

-- Add earning_status to trend_submissions if missing
ALTER TABLE trend_submissions 
ADD COLUMN IF NOT EXISTS earning_status earning_status DEFAULT 'pending';

-- ============================================
-- SECTION 6: Create trend_validations table
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
-- SECTION 7: Fix NULL values in user_profiles
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
    current_streak = COALESCE(current_streak, 0);

-- ============================================
-- SECTION 8: Fix validation count columns
-- ============================================

UPDATE trend_submissions
SET 
    validation_count = COALESCE(validation_count, 0),
    approve_count = COALESCE(approve_count, 0),
    reject_count = COALESCE(reject_count, 0);

-- ============================================
-- SECTION 9: Create indexes for performance
-- ============================================

CREATE INDEX IF NOT EXISTS idx_trend_submissions_spotter_id ON trend_submissions(spotter_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_status ON trend_submissions(status);
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON earnings_ledger(user_id);

-- ============================================
-- SECTION 10: Enable RLS
-- ============================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
DROP POLICY IF EXISTS "Public profiles" ON user_profiles;
CREATE POLICY "Public profiles" ON user_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users update own profile" ON user_profiles;
CREATE POLICY "Users update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Public trends" ON trend_submissions;
CREATE POLICY "Public trends" ON trend_submissions
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users submit trends" ON trend_submissions;
CREATE POLICY "Users submit trends" ON trend_submissions
    FOR INSERT WITH CHECK (auth.uid() = spotter_id);

DROP POLICY IF EXISTS "Public validations" ON trend_validations;
CREATE POLICY "Public validations" ON trend_validations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users create validations" ON trend_validations;
CREATE POLICY "Users create validations" ON trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

DROP POLICY IF EXISTS "Users view own earnings" ON earnings_ledger;
CREATE POLICY "Users view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FINAL: Verify everything is set up
-- ============================================

SELECT 
    'Setup Complete!' as message,
    (SELECT COUNT(*) FROM user_profiles) as total_users,
    (SELECT COUNT(*) FROM trend_submissions) as total_trends,
    (SELECT COUNT(*) FROM trend_validations) as total_validations;