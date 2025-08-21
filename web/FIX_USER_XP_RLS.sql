-- Fix user_xp RLS policies to allow users to interact with their own XP data

-- First, check if the table exists and show current policies
DO $$
BEGIN
    -- Check if user_xp table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_xp') THEN
        RAISE NOTICE 'user_xp table exists';
        
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own XP" ON user_xp;
        DROP POLICY IF EXISTS "Users can update own XP" ON user_xp;
        DROP POLICY IF EXISTS "Service role can do anything" ON user_xp;
        DROP POLICY IF EXISTS "System can award XP" ON user_xp;
        
        -- Enable RLS if not already enabled
        ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
        
        -- Create new, more permissive policies
        
        -- Users can view their own XP
        CREATE POLICY "Users can view own XP"
            ON user_xp
            FOR SELECT
            USING (auth.uid() = user_id);
            
        -- Users can insert their own XP record (for initial creation)
        CREATE POLICY "Users can create own XP record"
            ON user_xp
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        -- Users can update their own XP (through functions)
        CREATE POLICY "Users can update own XP"
            ON user_xp
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        -- Service role bypass (for server-side operations)
        CREATE POLICY "Service role bypass"
            ON user_xp
            FOR ALL
            USING (auth.role() = 'service_role');
            
        RAISE NOTICE 'Fixed RLS policies for user_xp table';
    ELSE
        -- If table doesn't exist, create it with proper structure
        CREATE TABLE IF NOT EXISTS user_xp (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            total_xp INTEGER DEFAULT 0,
            current_level INTEGER DEFAULT 1,
            xp_to_next_level INTEGER DEFAULT 100,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id)
        );
        
        -- Enable RLS
        ALTER TABLE user_xp ENABLE ROW LEVEL SECURITY;
        
        -- Create policies
        CREATE POLICY "Users can view own XP"
            ON user_xp
            FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can create own XP record"
            ON user_xp
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Users can update own XP"
            ON user_xp
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Service role bypass"
            ON user_xp
            FOR ALL
            USING (auth.role() = 'service_role');
            
        RAISE NOTICE 'Created user_xp table with proper RLS policies';
    END IF;
END $$;

-- Also check xp_events table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_events') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own events" ON xp_events;
        DROP POLICY IF EXISTS "Users can create events" ON xp_events;
        DROP POLICY IF EXISTS "Service role bypass" ON xp_events;
        
        -- Enable RLS
        ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
        
        -- Create new policies
        CREATE POLICY "Users can view own events"
            ON xp_events
            FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can create events"
            ON xp_events
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Service role bypass"
            ON xp_events
            FOR ALL
            USING (auth.role() = 'service_role');
            
        RAISE NOTICE 'Fixed RLS policies for xp_events table';
    END IF;
END $$;

-- Also check xp_ledger table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_ledger') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "Users can view own ledger" ON xp_ledger;
        DROP POLICY IF EXISTS "Users can create ledger entries" ON xp_ledger;
        DROP POLICY IF EXISTS "Service role bypass" ON xp_ledger;
        
        -- Enable RLS
        ALTER TABLE xp_ledger ENABLE ROW LEVEL SECURITY;
        
        -- Create new policies
        CREATE POLICY "Users can view own ledger"
            ON xp_ledger
            FOR SELECT
            USING (auth.uid() = user_id);
            
        CREATE POLICY "Users can create ledger entries"
            ON xp_ledger
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
            
        CREATE POLICY "Service role bypass"
            ON xp_ledger
            FOR ALL
            USING (auth.role() = 'service_role');
            
        RAISE NOTICE 'Fixed RLS policies for xp_ledger table';
    END IF;
END $$;

-- Drop all existing award_xp functions (handle multiple signatures)
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS award_xp(UUID, INTEGER, TEXT, TEXT, UUID, TEXT);

-- Create or replace the award_xp function to work with RLS
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_amount INTEGER,
    p_type TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reference_type TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to bypass RLS
SET search_path = public
AS $$
DECLARE
    v_new_total INTEGER;
BEGIN
    -- Insert or update user_xp
    INSERT INTO user_xp (user_id, total_xp, updated_at)
    VALUES (p_user_id, p_amount, NOW())
    ON CONFLICT (user_id) DO UPDATE
    SET 
        total_xp = user_xp.total_xp + p_amount,
        updated_at = NOW()
    RETURNING total_xp INTO v_new_total;
    
    -- Log the XP event if xp_events table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_events') THEN
        INSERT INTO xp_events (
            user_id,
            xp_change,
            event_type,
            description,
            reference_id,
            reference_type
        ) VALUES (
            p_user_id,
            p_amount,
            p_type,
            p_description,
            p_reference_id,
            p_reference_type
        );
    END IF;
    
    -- Log to xp_ledger if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'xp_ledger') THEN
        INSERT INTO xp_ledger (
            user_id,
            amount,
            reason,
            metadata
        ) VALUES (
            p_user_id,
            p_amount,
            COALESCE(p_description, p_type),
            jsonb_build_object(
                'type', p_type,
                'reference_id', p_reference_id,
                'reference_type', p_reference_type
            )
        );
    END IF;
    
    RETURN v_new_total;
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_xp TO authenticated;
GRANT EXECUTE ON FUNCTION award_xp(UUID, INTEGER, TEXT, TEXT, UUID, TEXT) TO authenticated;

-- Create user_xp_summary view if it doesn't exist
DROP VIEW IF EXISTS user_xp_summary CASCADE;
CREATE OR REPLACE VIEW user_xp_summary AS
SELECT 
    u.id as user_id,
    u.username,
    COALESCE(x.total_xp, 0) as total_xp,
    COALESCE(x.current_level, 1) as current_level,
    COALESCE(x.xp_to_next_level, 100) as xp_to_next_level
FROM 
    profiles u
    LEFT JOIN user_xp x ON u.id = x.user_id;

-- Grant access to the view
GRANT SELECT ON user_xp_summary TO authenticated;

-- Also create a simple function for awarding XP from client
CREATE OR REPLACE FUNCTION award_user_xp(
    p_amount INTEGER,
    p_type TEXT DEFAULT 'manual',
    p_description TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_new_total INTEGER;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Use the main award_xp function
    v_new_total := award_xp(v_user_id, p_amount, p_type, p_description, NULL, NULL);
    
    RETURN v_new_total;
END;
$$;

GRANT EXECUTE ON FUNCTION award_user_xp(INTEGER, TEXT, TEXT) TO authenticated;

-- Final confirmation
DO $$
BEGIN
    RAISE NOTICE 'All XP-related RLS policies have been fixed!';
    RAISE NOTICE 'You can now use award_xp() or award_user_xp() functions';
END $$;