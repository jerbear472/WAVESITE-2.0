-- Create comprehensive earnings tracking system

-- 1. Create earnings ledger table to track all earnings
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    earning_type TEXT NOT NULL CHECK (earning_type IN ('submission', 'validation', 'bonus', 'referral')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    payment_batch_id UUID,
    notes TEXT
);

-- 2. Create trend validations table to track votes
CREATE TABLE IF NOT EXISTS public.trend_validations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trend_submission_id UUID REFERENCES public.trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    vote TEXT NOT NULL CHECK (vote IN ('verify', 'reject')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_submission_id, validator_id) -- One vote per user per trend
);

-- 3. Add earnings summary columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS earnings_pending DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_approved DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS earnings_paid DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS verified_submissions INTEGER DEFAULT 0;

-- 4. Create function to add pending earnings when trend is submitted
CREATE OR REPLACE FUNCTION add_pending_earnings_on_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Add 10 cents pending earning
    INSERT INTO earnings_ledger (
        user_id,
        trend_submission_id,
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

-- 5. Create trigger for new submissions
DROP TRIGGER IF EXISTS add_earnings_on_submission ON trend_submissions;
CREATE TRIGGER add_earnings_on_submission
    AFTER INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION add_pending_earnings_on_submission();

-- 6. Create function to check and approve earnings based on votes
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
    WHERE trend_submission_id = NEW.trend_submission_id;
    
    -- Get submission owner
    SELECT spotter_id INTO submission_user_id
    FROM trend_submissions
    WHERE id = NEW.trend_submission_id;
    
    -- Check if there's a majority (tie goes to submitter)
    IF verify_count >= reject_count AND (verify_count + reject_count) >= 3 THEN
        -- Find the pending earning
        SELECT id INTO existing_earning_id
        FROM earnings_ledger
        WHERE trend_submission_id = NEW.trend_submission_id
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
            WHERE id = NEW.trend_submission_id;
        END IF;
    ELSIF reject_count > verify_count AND (verify_count + reject_count) >= 3 THEN
        -- Reject the earning
        UPDATE earnings_ledger
        SET status = 'rejected',
            notes = format('Rejected by majority vote (%s verify, %s reject)', verify_count, reject_count)
        WHERE trend_submission_id = NEW.trend_submission_id
        AND status = 'pending';
        
        -- Update user's pending earnings
        UPDATE profiles
        SET earnings_pending = earnings_pending - 0.10
        WHERE id = submission_user_id;
        
        -- Update trend status
        UPDATE trend_submissions
        SET status = 'rejected',
            validation_count = verify_count + reject_count
        WHERE id = NEW.trend_submission_id;
    END IF;
    
    -- Give validator 2 cents for participating
    INSERT INTO earnings_ledger (
        user_id,
        trend_submission_id,
        amount,
        status,
        earning_type,
        notes
    ) VALUES (
        NEW.validator_id,
        NEW.trend_submission_id,
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

-- 7. Create trigger for validation votes
DROP TRIGGER IF EXISTS check_verification_on_vote ON trend_validations;
CREATE TRIGGER check_verification_on_vote
    AFTER INSERT ON trend_validations
    FOR EACH ROW
    EXECUTE FUNCTION check_trend_verification_status();

-- 8. Create view for user earnings summary
CREATE OR REPLACE VIEW user_earnings_summary AS
SELECT 
    p.id as user_id,
    p.email,
    p.username,
    p.earnings_pending,
    p.earnings_approved,
    p.earnings_paid,
    p.total_submissions,
    p.verified_submissions,
    (p.earnings_pending + p.earnings_approved) as total_available,
    COUNT(DISTINCT el.id) as total_transactions,
    COUNT(DISTINCT tv.id) as total_validations
FROM profiles p
LEFT JOIN earnings_ledger el ON el.user_id = p.id
LEFT JOIN trend_validations tv ON tv.validator_id = p.id
GROUP BY p.id;

-- 9. Enable RLS on new tables
ALTER TABLE earnings_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
-- Earnings ledger policies
CREATE POLICY "Users can view own earnings" ON earnings_ledger
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can create earnings" ON earnings_ledger
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update earnings" ON earnings_ledger
    FOR UPDATE USING (true);

-- Validation policies
CREATE POLICY "Users can view all validations" ON trend_validations
    FOR SELECT USING (true);

CREATE POLICY "Users can create own validations" ON trend_validations
    FOR INSERT WITH CHECK (auth.uid() = validator_id);

CREATE POLICY "Users cannot validate own trends" ON trend_validations
    FOR INSERT WITH CHECK (
        auth.uid() != (
            SELECT spotter_id FROM trend_submissions 
            WHERE id = trend_submission_id
        )
    );

-- Grant permissions
GRANT ALL ON earnings_ledger TO authenticated;
GRANT ALL ON trend_validations TO authenticated;
GRANT SELECT ON user_earnings_summary TO authenticated;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_user_status ON earnings_ledger(user_id, status);
CREATE INDEX IF NOT EXISTS idx_validations_trend ON trend_validations(trend_submission_id);
CREATE INDEX IF NOT EXISTS idx_validations_validator ON trend_validations(validator_id);

-- Success message
SELECT 'Earnings system created successfully! Users earn $0.10 pending per submission, approved by majority vote.' as status;