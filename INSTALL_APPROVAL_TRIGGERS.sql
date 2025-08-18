-- INSTALL APPROVAL TRIGGERS
-- This ensures future trends automatically handle earnings when approved

BEGIN;

-- ============================================
-- DROP OLD TRIGGERS IF THEY EXIST
-- ============================================

DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON trend_submissions;
DROP TRIGGER IF EXISTS approve_validation_earnings_trigger ON trend_submissions;
DROP FUNCTION IF EXISTS handle_trend_approval() CASCADE;
DROP FUNCTION IF EXISTS approve_validation_earnings() CASCADE;

-- ============================================
-- CREATE TREND APPROVAL HANDLER
-- ============================================

CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_spotter_id UUID;
    v_approval_bonus NUMERIC := 0.50;
BEGIN
    -- Only process when trend becomes approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        v_spotter_id := NEW.spotter_id;
        
        -- 1. Create approval bonus
        INSERT INTO earnings_ledger (
            user_id,
            type,
            amount,
            status,
            reference_id,
            reference_type,
            description,
            metadata
        ) VALUES (
            v_spotter_id,
            'approval_bonus',
            v_approval_bonus,
            'approved',
            NEW.id,
            'trend',
            format('Approval bonus for trend: %s', LEFT(COALESCE(NEW.description, 'Untitled'), 100)),
            jsonb_build_object(
                'trend_id', NEW.id,
                'approved_at', NOW(),
                'approve_count', NEW.approve_count
            )
        );
        
        -- 2. Approve the submission earning
        UPDATE earnings_ledger
        SET 
            status = 'approved',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('approved_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- 3. Approve all validation earnings for this trend
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(el.metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', 'approved',
                          'approved_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        RAISE NOTICE 'Trend % approved. Bonus created for user %', NEW.id, v_spotter_id;
        
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        
        -- Handle rejection
        v_spotter_id := NEW.spotter_id;
        
        -- Mark submission earning as rejected
        UPDATE earnings_ledger
        SET 
            status = 'cancelled',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('rejected_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- Still approve validation earnings (validators get paid regardless)
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(el.metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', 'rejected',
                          'approved_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        RAISE NOTICE 'Trend % rejected. Submission cancelled for user %', NEW.id, v_spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER handle_trend_approval_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- ============================================
-- CREATE USER PROFILE UPDATER
-- ============================================

CREATE OR REPLACE FUNCTION update_user_profile_earnings()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_pending_total NUMERIC;
    v_approved_total NUMERIC;
BEGIN
    -- Get the user_id from the earnings record
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD.user_id;
    ELSE
        v_user_id := NEW.user_id;
    END IF;
    
    -- Calculate new totals for this user
    SELECT 
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0)
    INTO v_pending_total, v_approved_total
    FROM earnings_ledger
    WHERE user_id = v_user_id
    AND status IN ('pending', 'approved');
    
    -- Update user_profiles
    UPDATE user_profiles
    SET 
        pending_earnings = v_pending_total,
        approved_earnings = v_approved_total,
        total_earned = v_pending_total + v_approved_total
    WHERE id = v_user_id;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for earnings updates
DROP TRIGGER IF EXISTS update_user_profile_on_earnings_change ON earnings_ledger;
CREATE TRIGGER update_user_profile_on_earnings_change
    AFTER INSERT OR UPDATE OR DELETE ON earnings_ledger
    FOR EACH ROW
    EXECUTE FUNCTION update_user_profile_earnings();

COMMIT;

-- ============================================
-- TEST THE TRIGGERS
-- ============================================

-- Check if triggers are installed
SELECT 
    'Installed Triggers' as report,
    trigger_name,
    event_object_table,
    action_timing,
    array_agg(event_manipulation) as events
FROM information_schema.triggers
WHERE trigger_name IN (
    'handle_trend_approval_trigger',
    'update_user_profile_on_earnings_change',
    'update_trend_counts_on_validation'
)
GROUP BY trigger_name, event_object_table, action_timing
ORDER BY trigger_name;

-- Show a sample of recent trends and their earnings status
SELECT 
    'Recent Trends and Earnings' as report,
    ts.id,
    LEFT(ts.description, 50) as description,
    ts.status,
    ts.approve_count,
    ts.updated_at,
    COUNT(CASE WHEN el.type = 'trend_submission' THEN 1 END) as has_submission,
    COUNT(CASE WHEN el.type = 'approval_bonus' THEN 1 END) as has_bonus,
    MAX(CASE WHEN el.type = 'trend_submission' THEN el.status END) as submission_status,
    MAX(CASE WHEN el.type = 'approval_bonus' THEN el.status END) as bonus_status
FROM trend_submissions ts
LEFT JOIN earnings_ledger el ON el.reference_id = ts.id
WHERE ts.updated_at > NOW() - INTERVAL '7 days'
GROUP BY ts.id, ts.description, ts.status, ts.approve_count, ts.updated_at
ORDER BY ts.updated_at DESC
LIMIT 10;