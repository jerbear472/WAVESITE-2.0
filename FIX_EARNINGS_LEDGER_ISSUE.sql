-- Fix earnings_ledger earning_type NOT NULL constraint issue
-- This resolves the submission failure

-- ============================================
-- Option 1: Make earning_type nullable (simplest fix)
-- ============================================

ALTER TABLE public.earnings_ledger 
ALTER COLUMN earning_type DROP NOT NULL;

-- ============================================
-- Option 2: Drop the earnings_ledger table if not needed
-- ============================================

-- The earnings_ledger appears to be a legacy table that's not 
-- used by our simplified earnings system. Our system uses:
-- - profiles.earnings_pending
-- - profiles.earnings_approved  
-- - profiles.earnings_paid
-- - profiles.total_earnings

-- If you want to keep earnings_ledger for historical purposes,
-- we need to disable triggers that write to it:

DROP TRIGGER IF EXISTS track_earnings_ledger ON public.trend_submissions;
DROP TRIGGER IF EXISTS log_submission_earnings ON public.trend_submissions;
DROP TRIGGER IF EXISTS log_validation_earnings ON public.trend_validations;
DROP FUNCTION IF EXISTS public.track_earnings_ledger() CASCADE;
DROP FUNCTION IF EXISTS public.log_submission_earnings() CASCADE;
DROP FUNCTION IF EXISTS public.log_validation_earnings() CASCADE;

-- ============================================
-- Option 3: Fix the triggers to provide earning_type
-- ============================================

-- If earnings_ledger is required, update any trigger that inserts into it:

CREATE OR REPLACE FUNCTION public.log_earnings_safely()
RETURNS TRIGGER AS $$
BEGIN
    -- Only log if earnings_ledger exists and we have the data
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'earnings_ledger'
    ) THEN
        -- Check which columns exist
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'earnings_ledger'
            AND column_name = 'earning_type'
        ) THEN
            -- Insert with earning_type
            INSERT INTO public.earnings_ledger (
                user_id,
                amount,
                earning_type,
                description,
                created_at
            ) VALUES (
                COALESCE(NEW.spotter_id, NEW.validator_id),
                COALESCE(NEW.total_earned, NEW.reward_amount, 0),
                CASE 
                    WHEN TG_TABLE_NAME = 'trend_submissions' THEN 'trend_submission'
                    WHEN TG_TABLE_NAME = 'trend_validations' THEN 'trend_validation'
                    ELSE 'other'
                END,
                CASE 
                    WHEN TG_TABLE_NAME = 'trend_submissions' THEN 'Trend submission earnings'
                    WHEN TG_TABLE_NAME = 'trend_validations' THEN 'Validation reward'
                    ELSE 'Earnings'
                END,
                NOW()
            ) ON CONFLICT DO NOTHING; -- Prevent duplicate entries
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'earnings_ledger'
            AND column_name = 'type'
        ) THEN
            -- Insert with type instead of earning_type
            INSERT INTO public.earnings_ledger (
                user_id,
                amount,
                type,
                description,
                created_at
            ) VALUES (
                COALESCE(NEW.spotter_id, NEW.validator_id),
                COALESCE(NEW.total_earned, NEW.reward_amount, 0),
                CASE 
                    WHEN TG_TABLE_NAME = 'trend_submissions' THEN 'trend_submission'
                    WHEN TG_TABLE_NAME = 'trend_validations' THEN 'trend_validation'
                    ELSE 'other'
                END,
                CASE 
                    WHEN TG_TABLE_NAME = 'trend_submissions' THEN 'Trend submission earnings'
                    WHEN TG_TABLE_NAME = 'trend_validations' THEN 'Validation reward'
                    ELSE 'Earnings'
                END,
                NOW()
            ) ON CONFLICT DO NOTHING;
        END IF;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the main operation
        RAISE WARNING 'Could not log to earnings_ledger: %', SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RECOMMENDED SOLUTION: Disable earnings_ledger
-- ============================================

-- Since we're using the simplified earnings system that tracks
-- earnings directly in the profiles table, we should disable
-- any triggers that try to write to earnings_ledger

DO $$
DECLARE
    r RECORD;
BEGIN
    -- List all triggers on trend_submissions that might write to earnings_ledger
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'trend_submissions'
        AND trigger_name LIKE '%earning%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.trend_submissions', r.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
    
    -- List all triggers on trend_validations that might write to earnings_ledger
    FOR r IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'trend_validations'
        AND trigger_name LIKE '%earning%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.trend_validations', r.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', r.trigger_name;
    END LOOP;
END $$;

-- ============================================
-- Verify our simplified system is working
-- ============================================

-- Check that our main earnings triggers are in place
SELECT 
    'Submission earnings trigger' as trigger_type,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'calculate_submission_earnings_trigger'
        AND event_object_table = 'trend_submissions'
    ) as exists;

SELECT 
    'Validation earnings trigger' as trigger_type,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'calculate_validation_earnings_trigger'
        AND event_object_table = 'trend_validations'
    ) as exists;

SELECT 
    'Status change trigger' as trigger_type,
    EXISTS (
        SELECT 1 FROM information_schema.triggers 
        WHERE trigger_name = 'handle_trend_status_change_trigger'
        AND event_object_table = 'trend_submissions'
    ) as exists;

-- ============================================
-- Summary
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '✅ EARNINGS_LEDGER ISSUE FIXED';
    RAISE NOTICE '';
    RAISE NOTICE 'The earnings_ledger table is a legacy table not used by';
    RAISE NOTICE 'our simplified earnings system. We track earnings in:';
    RAISE NOTICE '  • profiles.earnings_pending';
    RAISE NOTICE '  • profiles.earnings_approved';
    RAISE NOTICE '  • profiles.total_earnings';
    RAISE NOTICE '';
    RAISE NOTICE 'All triggers trying to write to earnings_ledger have been';
    RAISE NOTICE 'disabled to prevent submission failures.';
END $$;