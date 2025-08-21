-- Fix RLS policies for xp_transactions table
-- This script ensures users can properly insert and read XP transactions

-- First, check if the table exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_transactions'
    ) THEN
        -- Drop existing policies to recreate them properly
        DROP POLICY IF EXISTS "Users can view own xp_transactions" ON xp_transactions;
        DROP POLICY IF EXISTS "Users can insert own xp_transactions" ON xp_transactions;
        DROP POLICY IF EXISTS "System can insert xp_transactions" ON xp_transactions;
        DROP POLICY IF EXISTS "Enable all for authenticated users" ON xp_transactions;
        
        -- Create proper RLS policies
        CREATE POLICY "Users can view own xp_transactions" 
        ON xp_transactions FOR SELECT 
        TO authenticated 
        USING (user_id = auth.uid());

        CREATE POLICY "Users can insert own xp_transactions" 
        ON xp_transactions FOR INSERT 
        TO authenticated 
        WITH CHECK (user_id = auth.uid());

        -- Allow system/service role to insert for any user (for triggers)
        CREATE POLICY "Service role can manage xp_transactions" 
        ON xp_transactions FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);

        -- Ensure RLS is enabled
        ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Fixed RLS policies for xp_transactions table';
    END IF;
END $$;

-- Also check and fix xp_events table if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_events'
    ) THEN
        -- Drop existing policies to recreate them properly
        DROP POLICY IF EXISTS "Users can view own xp_events" ON xp_events;
        DROP POLICY IF EXISTS "Users can insert own xp_events" ON xp_events;
        DROP POLICY IF EXISTS "System can insert xp_events" ON xp_events;
        DROP POLICY IF EXISTS "Enable all for authenticated users" ON xp_events;
        
        -- Create proper RLS policies
        CREATE POLICY "Users can view own xp_events" 
        ON xp_events FOR SELECT 
        TO authenticated 
        USING (user_id = auth.uid());

        CREATE POLICY "Users can insert own xp_events" 
        ON xp_events FOR INSERT 
        TO authenticated 
        WITH CHECK (user_id = auth.uid());

        -- Allow system/service role to insert for any user (for triggers)
        CREATE POLICY "Service role can manage xp_events" 
        ON xp_events FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);

        -- Ensure RLS is enabled
        ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Fixed RLS policies for xp_events table';
    END IF;
END $$;

-- Fix trend_submissions RLS to ensure it can trigger XP events
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_submissions'
    ) THEN
        -- Drop and recreate policies for trend_submissions
        DROP POLICY IF EXISTS "Users can view all trend submissions" ON trend_submissions;
        DROP POLICY IF EXISTS "Users can insert own trend submissions" ON trend_submissions;
        DROP POLICY IF EXISTS "Users can update own trend submissions" ON trend_submissions;
        DROP POLICY IF EXISTS "Enable all for authenticated users" ON trend_submissions;
        
        -- Users can view all trends (for validation)
        CREATE POLICY "Users can view all trend submissions" 
        ON trend_submissions FOR SELECT 
        TO authenticated 
        USING (true);

        -- Users can only insert their own trends
        CREATE POLICY "Users can insert own trend submissions" 
        ON trend_submissions FOR INSERT 
        TO authenticated 
        WITH CHECK (spotter_id = auth.uid());

        -- Users can update their own trends
        CREATE POLICY "Users can update own trend submissions" 
        ON trend_submissions FOR UPDATE 
        TO authenticated 
        USING (spotter_id = auth.uid())
        WITH CHECK (spotter_id = auth.uid());

        -- Service role has full access
        CREATE POLICY "Service role can manage trend submissions" 
        ON trend_submissions FOR ALL 
        TO service_role
        USING (true)
        WITH CHECK (true);

        -- Ensure RLS is enabled
        ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Fixed RLS policies for trend_submissions table';
    END IF;
END $$;

-- Create or replace the function that awards XP (with proper security definer)
CREATE OR REPLACE FUNCTION award_xp_for_trend_submission()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    xp_to_award INTEGER;
    event_description TEXT;
BEGIN
    -- Only award XP on insert
    IF TG_OP = 'INSERT' THEN
        -- Base XP for submission
        xp_to_award := 10;
        event_description := 'Trend submission';
        
        -- Try to insert into xp_events first
        IF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'xp_events'
        ) THEN
            INSERT INTO xp_events (
                user_id,
                event_type,
                xp_change,
                description,
                created_at
            ) VALUES (
                NEW.spotter_id,
                'trend_submission',
                xp_to_award,
                event_description,
                NOW()
            );
        -- Fall back to xp_transactions if xp_events doesn't exist
        ELSIF EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'xp_transactions'
        ) THEN
            INSERT INTO xp_transactions (
                user_id,
                amount,
                type,
                description,
                created_at
            ) VALUES (
                NEW.spotter_id,
                xp_to_award,
                'trend_submission',
                event_description,
                NOW()
            );
        END IF;
        
        -- Update the trend with XP amount
        NEW.xp_amount := xp_to_award;
        NEW.xp_awarded := true;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger with proper permissions
DROP TRIGGER IF EXISTS award_xp_on_trend_submission ON trend_submissions;
CREATE TRIGGER award_xp_on_trend_submission
    BEFORE INSERT ON trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION award_xp_for_trend_submission();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Specifically grant permissions on xp tables
GRANT ALL ON xp_transactions TO authenticated;
GRANT ALL ON xp_events TO authenticated;
GRANT ALL ON trend_submissions TO authenticated;

-- If user_xp_summary exists, fix its RLS too
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_xp_summary'
    ) THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own xp summary" ON user_xp_summary;
        DROP POLICY IF EXISTS "Users can view all xp summaries" ON user_xp_summary;
        
        -- Users can view all summaries (for leaderboard)
        CREATE POLICY "Users can view all xp summaries" 
        ON user_xp_summary FOR SELECT 
        TO authenticated 
        USING (true);

        -- Ensure RLS is enabled
        ALTER TABLE user_xp_summary ENABLE ROW LEVEL SECURITY;
        
        RAISE NOTICE 'Fixed RLS policies for user_xp_summary table';
    END IF;
END $$;

-- If xp_leaderboard view exists, ensure it's accessible
DO $$ 
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'xp_leaderboard'
    ) THEN
        GRANT SELECT ON xp_leaderboard TO authenticated;
        RAISE NOTICE 'Granted SELECT on xp_leaderboard view';
    END IF;
END $$;

RAISE NOTICE 'RLS fix completed successfully!';