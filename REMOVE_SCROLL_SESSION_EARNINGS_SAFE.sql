-- Remove scroll session earnings - scroll sessions are now only for streak multipliers
-- SAFE VERSION: Checks for existence before making changes

-- 1. Drop the trigger that adds earnings when scroll sessions end (if exists)
DROP TRIGGER IF EXISTS on_scroll_session_update ON public.scroll_sessions CASCADE;
DROP FUNCTION IF EXISTS handle_scroll_session_earnings() CASCADE;

-- 2. Remove scroll session earnings columns if table and columns exist
DO $$ 
BEGIN
    -- Check if scroll_sessions table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'scroll_sessions') THEN
        
        -- Drop columns if they exist
        ALTER TABLE public.scroll_sessions 
        DROP COLUMN IF EXISTS base_earnings,
        DROP COLUMN IF EXISTS bonus_earnings,
        DROP COLUMN IF EXISTS total_earnings,
        DROP COLUMN IF EXISTS earnings;
        
        RAISE NOTICE 'Removed earnings columns from scroll_sessions table';
    ELSE
        RAISE NOTICE 'scroll_sessions table does not exist - skipping column removal';
    END IF;
END $$;

-- 3. Remove any existing scroll session earnings from the earnings ledger (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'earnings_ledger') THEN
        
        DELETE FROM public.earnings_ledger 
        WHERE type = 'scroll_session';
        
        RAISE NOTICE 'Removed scroll session earnings from earnings_ledger';
    ELSE
        RAISE NOTICE 'earnings_ledger table does not exist - skipping';
    END IF;
END $$;

-- 4. Update the earnings ledger check constraint to remove scroll_session type (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'earnings_ledger') THEN
        
        ALTER TABLE public.earnings_ledger 
        DROP CONSTRAINT IF EXISTS earnings_ledger_type_check;

        ALTER TABLE public.earnings_ledger 
        ADD CONSTRAINT earnings_ledger_type_check 
        CHECK (type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral'));
        
        RAISE NOTICE 'Updated earnings_ledger type constraint';
    END IF;
END $$;

-- 5. Update or create the add_earnings function to reject scroll_session type
CREATE OR REPLACE FUNCTION add_earnings(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_description TEXT,
    p_reference_id UUID DEFAULT NULL,
    p_reference_table TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_earning_id UUID;
BEGIN
    -- Reject scroll_session type
    IF p_type = 'scroll_session' THEN
        RAISE EXCEPTION 'Scroll sessions no longer generate direct earnings. They only provide streak multipliers.';
    END IF;
    
    -- Check if earnings_ledger exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'earnings_ledger') THEN
        
        INSERT INTO public.earnings_ledger (
            user_id, amount, type, description, reference_id, reference_table, status
        ) VALUES (
            p_user_id, p_amount, p_type, p_description, p_reference_id, p_reference_table, 'confirmed'
        ) RETURNING id INTO v_earning_id;
    END IF;
    
    -- Update user profile totals if profiles table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'profiles') THEN
        
        UPDATE public.profiles
        SET 
            total_earnings = COALESCE(total_earnings, 0) + p_amount,
            trends_spotted = CASE 
                WHEN p_type = 'trend_submission' THEN COALESCE(trends_spotted, 0) + 1 
                ELSE COALESCE(trends_spotted, 0)
            END
        WHERE id = p_user_id;
    END IF;
    
    -- Also check user_profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'user_profiles') THEN
        
        UPDATE public.user_profiles
        SET 
            total_earnings = COALESCE(total_earnings, 0) + p_amount,
            trends_spotted = CASE 
                WHEN p_type = 'trend_submission' THEN COALESCE(trends_spotted, 0) + 1 
                ELSE COALESCE(trends_spotted, 0)
            END
        WHERE id = p_user_id;
    END IF;
    
    RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Clean up any user profiles that may have inflated earnings from scroll sessions
-- This recalculates earnings based only on trend submissions and validations
DO $$
BEGIN
    -- Update profiles table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'profiles') THEN
        
        IF EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' 
                   AND table_name = 'earnings_ledger') THEN
            
            UPDATE public.profiles p
            SET 
                total_earnings = COALESCE((
                    SELECT SUM(amount) 
                    FROM public.earnings_ledger 
                    WHERE user_id = p.id 
                    AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
                    AND status IN ('confirmed', 'paid')
                ), 0),
                earnings_approved = COALESCE((
                    SELECT SUM(amount) 
                    FROM public.earnings_ledger 
                    WHERE user_id = p.id 
                    AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
                    AND status = 'confirmed'
                ), 0),
                earnings_paid = COALESCE((
                    SELECT SUM(amount) 
                    FROM public.earnings_ledger 
                    WHERE user_id = p.id 
                    AND type IN ('trend_submission', 'trend_validation', 'challenge_completion', 'bonus', 'referral')
                    AND status = 'paid'
                ), 0)
            WHERE EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = 'profiles'
                AND column_name IN ('total_earnings', 'earnings_approved', 'earnings_paid')
            );
            
            RAISE NOTICE 'Updated profiles earnings';
        END IF;
    END IF;
END $$;

-- 7. Add comment explaining scroll sessions are for streaks only (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' 
               AND table_name = 'scroll_sessions') THEN
        
        COMMENT ON TABLE public.scroll_sessions IS 'Scroll sessions track user scrolling activity for streak multipliers only. They do not generate direct earnings.';
        RAISE NOTICE 'Added comment to scroll_sessions table';
    END IF;
END $$;

-- Final message
DO $$
BEGIN
    RAISE NOTICE 'Scroll session earnings removal complete. Scroll sessions (if they exist) now only provide streak multipliers for trend submissions.';
END $$;