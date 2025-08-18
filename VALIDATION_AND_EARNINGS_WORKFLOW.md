# Trend Validation and Earnings Workflow Documentation

## Current State Analysis

### 1. **Trend Validation Process**

#### Voting Mechanism
- Users validate trends by voting: `approve`, `reject`, or `skip`
- Votes are stored in the `trend_validations` table
- **Threshold**: 3 votes needed to approve or reject a trend (defined in `FIX_VOTE_COUNTS_REALTIME.sql`)

#### Vote Counting Trigger
```sql
-- From FIX_VOTE_COUNTS_REALTIME.sql
-- Trigger fires AFTER INSERT/UPDATE/DELETE on trend_validations
-- Updates approve_count, reject_count, and validation_status
IF v_approve_count >= 3 THEN
    v_status := 'approved';
ELSIF v_reject_count >= 3 THEN
    v_status := 'rejected';
ELSE
    v_status := 'pending';
END IF;
```

### 2. **Status Transitions**

#### Trend Status Flow
1. **submitted** → Initial status when trend is created
2. **validating** → When trend has 1-2 votes
3. **approved** → When trend reaches 3 approve votes
4. **rejected** → When trend reaches 3 reject votes

#### Database Updates
- `trend_submissions.status` - Main trend status
- `trend_submissions.validation_status` - Validation-specific status
- `trend_submissions.approve_count` - Count of approve votes
- `trend_submissions.reject_count` - Count of reject votes

### 3. **Earnings Creation**

#### Validation Earnings ($0.02 per vote)
- Created immediately when user validates
- Stored in `earnings_ledger` with status = 'pending'
- No tier multipliers applied

#### Trend Submission Earnings ($0.25 base)
- Created when trend is submitted
- Initially status = 'pending'
- Awaits validation outcome

#### Approval Bonus ($0.50)
- Should be created when trend reaches 'approved' status
- Added to the original submitter's earnings

## IDENTIFIED ISSUES

### ❌ **Missing Approval Trigger**
- **Problem**: No active trigger to create approval bonus when trend is approved
- **Impact**: Submitters don't receive $0.50 bonus when trends are approved
- **Evidence**: All approval bonus triggers have been dropped in cleanup scripts

### ❌ **Missing Earnings Status Transition**
- **Problem**: No mechanism to move earnings from 'pending' to 'approved'
- **Impact**: All earnings remain in pending status indefinitely
- **Evidence**: No active functions updating earnings_ledger status

### ❌ **No Background Job**
- **Problem**: No cron job or background process to handle approvals
- **Impact**: Manual intervention required to approve earnings

## SOLUTION: Complete Approval System

### Implementation Plan

1. **Create Approval Trigger Function**
2. **Handle Earnings Status Transitions**
3. **Add Approval Bonus Creation**
4. **Update User Profiles with Correct Totals**

## SQL Implementation

```sql
-- COMPLETE TREND APPROVAL AND EARNINGS SYSTEM
-- This handles the entire workflow from validation to earnings approval

BEGIN;

-- ============================================
-- PART 1: CREATE APPROVAL HANDLER FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION handle_trend_approval()
RETURNS TRIGGER AS $$
DECLARE
    v_spotter_id UUID;
    v_submission_earning NUMERIC;
    v_approval_bonus NUMERIC := 0.50; -- $0.50 approval bonus
BEGIN
    -- Only process when trend becomes approved
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        
        -- Get the spotter (submitter) ID
        v_spotter_id := NEW.spotter_id;
        
        -- 1. Create approval bonus in earnings_ledger
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
            'approved', -- Bonus is immediately approved
            NEW.id,
            'trend',
            format('Approval bonus for trend: %s', COALESCE(NEW.description, 'Untitled')),
            jsonb_build_object(
                'trend_id', NEW.id,
                'approved_at', NOW(),
                'approve_count', NEW.approve_count
            )
        );
        
        -- 2. Update original submission earning from pending to approved
        UPDATE earnings_ledger
        SET 
            status = 'approved',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('approved_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- 3. Update user_profiles with new earnings
        UPDATE user_profiles
        SET 
            -- Move submission earning from pending to approved
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - 0.25),
            approved_earnings = COALESCE(approved_earnings, 0) + 0.25 + v_approval_bonus,
            -- Add bonus to total
            total_earned = COALESCE(total_earned, 0) + v_approval_bonus,
            -- Increment approved trends counter
            trends_spotted = COALESCE(trends_spotted, 0) + 1
        WHERE id = v_spotter_id;
        
        RAISE NOTICE 'Trend % approved. Bonus paid to user %', NEW.id, v_spotter_id;
        
    ELSIF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        
        -- Handle rejection: Remove from pending but don't add to approved
        v_spotter_id := NEW.spotter_id;
        
        -- Update submission earning to rejected status
        UPDATE earnings_ledger
        SET 
            status = 'rejected',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object('rejected_at', NOW())
        WHERE reference_id = NEW.id
        AND type = 'trend_submission'
        AND status = 'pending';
        
        -- Remove from pending earnings in user_profiles
        UPDATE user_profiles
        SET 
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - 0.25)
        WHERE id = v_spotter_id;
        
        RAISE NOTICE 'Trend % rejected. Earnings removed for user %', NEW.id, v_spotter_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trend approval
DROP TRIGGER IF EXISTS handle_trend_approval_trigger ON trend_submissions;
CREATE TRIGGER handle_trend_approval_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION handle_trend_approval();

-- ============================================
-- PART 2: CREATE VALIDATION EARNINGS APPROVER
-- ============================================

CREATE OR REPLACE FUNCTION approve_validation_earnings()
RETURNS TRIGGER AS $$
BEGIN
    -- When a trend is finalized (approved or rejected),
    -- approve all validation earnings for that trend
    IF (NEW.status IN ('approved', 'rejected')) AND 
       (OLD.status NOT IN ('approved', 'rejected')) THEN
        
        -- Update all validation earnings for this trend to approved
        UPDATE earnings_ledger el
        SET 
            status = 'approved',
            metadata = COALESCE(metadata, '{}'::jsonb) || 
                      jsonb_build_object(
                          'trend_outcome', NEW.status,
                          'finalized_at', NOW()
                      )
        FROM trend_validations tv
        WHERE el.reference_id = tv.id
        AND el.type = 'validation'
        AND el.status = 'pending'
        AND tv.trend_id = NEW.id;
        
        -- Update user_profiles for all validators
        WITH validator_earnings AS (
            SELECT 
                tv.validator_id,
                COUNT(*) * 0.02 as total_validation_earnings
            FROM trend_validations tv
            WHERE tv.trend_id = NEW.id
            GROUP BY tv.validator_id
        )
        UPDATE user_profiles up
        SET 
            pending_earnings = GREATEST(0, 
                COALESCE(pending_earnings, 0) - ve.total_validation_earnings),
            approved_earnings = COALESCE(approved_earnings, 0) + ve.total_validation_earnings
        FROM validator_earnings ve
        WHERE up.id = ve.validator_id;
        
        RAISE NOTICE 'Approved validation earnings for trend %', NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for validation earnings approval
DROP TRIGGER IF EXISTS approve_validation_earnings_trigger ON trend_submissions;
CREATE TRIGGER approve_validation_earnings_trigger
    AFTER UPDATE OF status ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION approve_validation_earnings();

-- ============================================
-- PART 3: FIX EXISTING DATA
-- ============================================

-- Fix already approved trends that didn't get bonuses
DO $$
DECLARE
    v_trend RECORD;
    v_bonus_exists BOOLEAN;
BEGIN
    FOR v_trend IN 
        SELECT id, spotter_id, description, approve_count
        FROM trend_submissions
        WHERE status = 'approved'
    LOOP
        -- Check if bonus already exists
        SELECT EXISTS(
            SELECT 1 FROM earnings_ledger
            WHERE reference_id = v_trend.id
            AND type = 'approval_bonus'
        ) INTO v_bonus_exists;
        
        IF NOT v_bonus_exists THEN
            -- Create the missing bonus
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
                v_trend.spotter_id,
                'approval_bonus',
                0.50,
                'approved',
                v_trend.id,
                'trend',
                format('Approval bonus for trend: %s', COALESCE(v_trend.description, 'Untitled')),
                jsonb_build_object(
                    'trend_id', v_trend.id,
                    'retroactive', true,
                    'fixed_at', NOW()
                )
            );
            
            RAISE NOTICE 'Created missing bonus for trend %', v_trend.id;
        END IF;
    END LOOP;
END $$;

-- Update all pending validation earnings for already finalized trends
UPDATE earnings_ledger el
SET 
    status = 'approved',
    metadata = COALESCE(metadata, '{}'::jsonb) || 
              jsonb_build_object('retroactive_approval', true)
FROM trend_validations tv
JOIN trend_submissions ts ON tv.trend_id = ts.id
WHERE el.reference_id = tv.id
AND el.type = 'validation'
AND el.status = 'pending'
AND ts.status IN ('approved', 'rejected');

-- Recalculate user_profiles based on earnings_ledger
WITH user_earnings AS (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_total,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as approved_total,
        SUM(CASE WHEN status IN ('pending', 'approved') THEN amount ELSE 0 END) as total
    FROM earnings_ledger
    GROUP BY user_id
)
UPDATE user_profiles up
SET 
    pending_earnings = ue.pending_total,
    approved_earnings = ue.approved_total,
    total_earned = ue.total
FROM user_earnings ue
WHERE up.id = ue.user_id;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check trends with missing bonuses
SELECT 
    ts.id,
    ts.spotter_id,
    ts.status,
    ts.approve_count,
    EXISTS(
        SELECT 1 FROM earnings_ledger el
        WHERE el.reference_id = ts.id
        AND el.type = 'approval_bonus'
    ) as has_bonus
FROM trend_submissions ts
WHERE ts.status = 'approved';

-- Check earnings by status
SELECT 
    status,
    type,
    COUNT(*) as count,
    SUM(amount) as total_amount
FROM earnings_ledger
GROUP BY status, type
ORDER BY status, type;

-- Check user earnings totals
SELECT 
    up.id,
    up.username,
    up.pending_earnings,
    up.approved_earnings,
    up.total_earned,
    el.calculated_pending,
    el.calculated_approved,
    el.calculated_total
FROM user_profiles up
JOIN (
    SELECT 
        user_id,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as calculated_pending,
        SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END) as calculated_approved,
        SUM(amount) as calculated_total
    FROM earnings_ledger
    WHERE status IN ('pending', 'approved')
    GROUP BY user_id
) el ON el.user_id = up.id
WHERE up.total_earned > 0
ORDER BY up.total_earned DESC
LIMIT 20;
```

## Testing the System

1. **Submit a new trend** → Creates pending earning ($0.25)
2. **3 users validate** → Each gets pending earning ($0.02)
3. **Trend reaches 3 approvals** → Triggers:
   - Trend status → 'approved'
   - Submission earning → 'approved'
   - Approval bonus created → 'approved' ($0.50)
   - All validation earnings → 'approved'
   - User profiles updated with correct totals

## Monitoring

```sql
-- Monitor recent approvals
SELECT 
    ts.id,
    ts.description,
    ts.status,
    ts.approve_count,
    ts.updated_at,
    el.approval_bonus,
    el.submission_earning,
    el.validation_count
FROM trend_submissions ts
LEFT JOIN LATERAL (
    SELECT 
        MAX(CASE WHEN type = 'approval_bonus' THEN amount END) as approval_bonus,
        MAX(CASE WHEN type = 'trend_submission' THEN amount END) as submission_earning,
        COUNT(CASE WHEN type = 'validation' THEN 1 END) as validation_count
    FROM earnings_ledger
    WHERE reference_id = ts.id OR 
          reference_id IN (SELECT id FROM trend_validations WHERE trend_id = ts.id)
) el ON true
WHERE ts.updated_at > NOW() - INTERVAL '24 hours'
ORDER BY ts.updated_at DESC;
```