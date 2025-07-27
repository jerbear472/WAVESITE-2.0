-- Fix for earnings system - handles column naming issues

-- First, let's check what columns exist in trend_submissions
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
ORDER BY ordinal_position;

-- Drop existing tables if they have wrong structure
DROP TABLE IF EXISTS public.trend_validations CASCADE;
DROP TABLE IF EXISTS public.earnings_ledger CASCADE;

-- Recreate earnings_ledger with correct foreign key
CREATE TABLE public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    earning_type TEXT NOT NULL CHECK (earning_type IN ('submission', 'validation', 'bonus', 'referral')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_batch_id UUID,
    notes TEXT
);

-- Recreate trend_validations with correct foreign key
CREATE TABLE public.trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('verify', 'reject')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- Add earnings columns to profiles if they don't exist
DO $$ 
BEGIN
    -- Add earnings_pending if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'earnings_pending') THEN
        ALTER TABLE public.profiles ADD COLUMN earnings_pending DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add earnings_approved if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'earnings_approved') THEN
        ALTER TABLE public.profiles ADD COLUMN earnings_approved DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add earnings_paid if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'earnings_paid') THEN
        ALTER TABLE public.profiles ADD COLUMN earnings_paid DECIMAL(10,2) DEFAULT 0.00;
    END IF;
    
    -- Add total_submissions if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'total_submissions') THEN
        ALTER TABLE public.profiles ADD COLUMN total_submissions INTEGER DEFAULT 0;
    END IF;
    
    -- Add verified_submissions if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'profiles' 
                  AND column_name = 'verified_submissions') THEN
        ALTER TABLE public.profiles ADD COLUMN verified_submissions INTEGER DEFAULT 0;
    END IF;
END $$;

-- Create function to add pending earnings when trend is submitted
CREATE OR REPLACE FUNCTION add_pending_earnings_on_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Add 10 cents pending earning
    INSERT INTO earnings_ledger (
        user_id,
        trend_id,
        amount,
        status,
        earning_type,
        notes
    ) VALUES (
        NEW.spotter_id,
        NEW.id,
        0.10,
        'pending',
        'submission',
        'Pending verification for trend submission'
    );
    
    -- Update user's pending earnings
    UPDATE profiles 
    SET earnings_pending = earnings_pending + 0.10,
        total_submissions = total_submissions + 1
    WHERE id = NEW.spotter_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new submissions
DROP TRIGGER IF EXISTS add_earnings_on_submission ON trend_submissions;
CREATE TRIGGER add_earnings_on_submission
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION add_pending_earnings_on_submission();

-- Create function to check and approve earnings based on votes
CREATE OR REPLACE FUNCTION check_trend_verification_status()
RETURNS TRIGGER AS $$
DECLARE
    verify_count INTEGER;
    reject_count INTEGER;
    submission_user_id UUID;
    existing_earning_id UUID;
BEGIN
    -- Count votes
    SELECT 
        COUNT(CASE WHEN vote = 'verify' THEN 1 END),
        COUNT(CASE WHEN vote = 'reject' THEN 1 END)
    INTO verify_count, reject_count
    FROM trend_validations
    WHERE trend_id = NEW.trend_id;
    
    -- Get submission owner
    SELECT spotter_id INTO submission_user_id
    FROM trend_submissions
    WHERE id = NEW.trend_id;
    
    -- Check if there's a majority (tie goes to submitter)
    IF verify_count >= reject_count AND (verify_count + reject_count) >= 3 THEN
        -- Find the pending earning
        SELECT id INTO existing_earning_id
        FROM earnings_ledger
        WHERE trend_id = NEW.trend_id
        AND status = 'pending'
        LIMIT 1;
        
        IF existing_earning_id IS NOT NULL THEN
            -- Approve the earning
            UPDATE earnings_ledger
            SET status = 'approved',
                approved_at = NOW(),
                notes = format('Verified by majority vote (%s verify, %s reject)', verify_count, reject_count)
            WHERE id = existing_earning_id;
            
            -- Update user's earnings
            UPDATE profiles
            SET earnings_pending = earnings_pending - 0.10,
                earnings_approved = earnings_approved + 0.10,
                verified_submissions = verified_submissions + 1
            WHERE id = submission_user_id;
            
            -- Update trend status
            UPDATE trend_submissions
            SET status = 'approved',
                validated_at = NOW(),
                validation_count = verify_count + reject_count
            WHERE id = NEW.trend_id;
        END IF;
    ELSIF reject_count > verify_count AND (verify_count + reject_count) >= 3 THEN
        -- Reject the earning
        UPDATE earnings_ledger
        SET status = 'rejected',
            notes = format('Rejected by majority vote (%s verify, %s reject)', verify_count, reject_count)
        WHERE trend_id = NEW.trend_id
        AND status = 'pending';
        
        -- Update user's pending earnings
        UPDATE profiles
        SET earnings_pending = earnings_pending - 0.10
        WHERE id = submission_user_id;
        
        -- Update trend status
        UPDATE trend_submissions
        SET status = 'rejected',
            validation_count = verify_count + reject_count
        WHERE id = NEW.trend_id;
    END IF;
    
    -- Give validator 2 cents for participating
    INSERT INTO earnings_ledger (
        user_id,
        trend_id,
        amount,
        status,
        earning_type,
        notes
    ) VALUES (
        NEW.validator_id,
        NEW.trend_id,
        0.02,
        'approved',
        'validation',
        'Reward for trend validation'
    );
    
    -- Update validator's approved earnings
    UPDATE profiles
    SET earnings_approved = earnings_approved + 0.02
    WHERE id = NEW.validator_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation votes
DROP TRIGGER IF EXISTS check_verification_on_vote ON trend_validations;
CREATE TRIGGER check_verification_on_vote
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION check_trend_verification_status();

-- Enable RLS on new tables
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create earnings" ON earnings_ledger
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update earnings" ON earnings_ledger
    FOR UPDATE USING (true);

CREATE POLICY "Users can view all validations" ON trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Users can create own validations" ON trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users cannot validate own trends" ON trend_validations
    FOR INSERT WITH CHECK (
        auth.uid() != (
            SELECT spotter_id FROM trend_submissions 
            WHERE id = trend_id
        )
    );

-- Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON trend_validations TO authenticated;

-- Create indexes for performance
CREATE INDEX idx_earnings_user_status ON earnings_ledger(user_id, status);
CREATE INDEX idx_validations_trend ON trend_validations(trend_id);
CREATE INDEX idx_validations_validator ON trend_validations(validator_id);

-- Add missing columns to trend_submissions
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'trend_submissions' 
                  AND column_name = 'status') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN status TEXT DEFAULT 'pending' 
        CHECK (status IN ('pending', 'approved', 'rejected', 'viral'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = 'trend_submissions' 
                  AND column_name = 'validated_at') THEN
        ALTER TABLE public.trend_submissions 
        ADD COLUMN validated_at TIMESTAMPTZ;
    END IF;
END $$;

-- Success message
SELECT 'Earnings system fixed! Tables now use trend_id instead of trend_submission_id.' as status;