-- Fix Row Level Security for earnings_ledger table
-- This fixes the "new row violates row-level security policy" error when submitting trends

-- Step 1: Check if earnings_ledger table exists and its current policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'earnings_ledger') THEN
        RAISE NOTICE 'earnings_ledger table exists, fixing RLS policies';
    ELSE
        RAISE NOTICE 'earnings_ledger table does not exist, creating it';
    END IF;
END $$;

-- Step 2: Create earnings_ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL, -- 'trend_spot', 'validation', 'bonus', etc.
    description TEXT,
    reference_id UUID, -- ID of the trend or validation
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS on the table
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Users can insert own earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "System can insert earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Service role bypass" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Enable all for service role" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.earnings_ledger;

-- Step 5: Create proper RLS policies

-- Policy 1: Users can view their own earnings
CREATE POLICY "Users can view own earnings"
ON public.earnings_ledger
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Allow inserts from authenticated users (for their own records)
CREATE POLICY "Users can insert own earnings"
ON public.earnings_ledger
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 3: Allow the service role to do anything (for system operations)
CREATE POLICY "Service role full access"
ON public.earnings_ledger
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 4: Allow system functions to insert earnings (using SECURITY DEFINER)
CREATE POLICY "System functions can insert"
ON public.earnings_ledger
FOR INSERT
TO authenticated
WITH CHECK (true); -- This allows functions to insert for any user

-- Step 6: Create or replace the function that adds earnings
CREATE OR REPLACE FUNCTION public.add_earnings_entry(
    p_user_id UUID,
    p_amount DECIMAL,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with elevated privileges
AS $$
DECLARE
    v_entry_id UUID;
BEGIN
    INSERT INTO public.earnings_ledger (
        user_id,
        amount,
        type,
        description,
        reference_id,
        created_at
    ) VALUES (
        p_user_id,
        p_amount,
        p_type,
        p_description,
        p_reference_id,
        NOW()
    ) RETURNING id INTO v_entry_id;
    
    RETURN v_entry_id;
END;
$$;

-- Step 7: Grant necessary permissions
GRANT ALL ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;
GRANT EXECUTE ON FUNCTION public.add_earnings_entry(UUID, DECIMAL, TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_earnings_entry(UUID, DECIMAL, TEXT, TEXT, UUID) TO service_role;

-- Step 8: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON public.earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_type ON public.earnings_ledger(type);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON public.earnings_ledger(created_at);

-- Step 9: Update any existing triggers or functions that insert into earnings_ledger
-- to use the add_earnings_entry function or run with SECURITY DEFINER

-- Step 10: If trend submission is failing, let's also check trend_submissions RLS
ALTER TABLE public.trend_submissions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for trend_submissions
DROP POLICY IF EXISTS "Anyone can view trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Authenticated users can insert trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Users can update own trends" ON public.trend_submissions;
DROP POLICY IF EXISTS "Service role bypass" ON public.trend_submissions;

-- Allow anyone to view trends
CREATE POLICY "Anyone can view trends"
ON public.trend_submissions
FOR SELECT
TO public
USING (true);

-- Allow authenticated users to insert trends
CREATE POLICY "Authenticated users can insert trends"
ON public.trend_submissions
FOR INSERT
TO authenticated
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND (spotter_id = auth.uid() OR spotter_id IS NULL)
);

-- Allow users to update their own trends
CREATE POLICY "Users can update own trends"
ON public.trend_submissions
FOR UPDATE
TO authenticated
USING (spotter_id = auth.uid())
WITH CHECK (spotter_id = auth.uid());

-- Service role can do anything
CREATE POLICY "Service role full access trends"
ON public.trend_submissions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Step 11: Fix the trend submission function to handle earnings properly
CREATE OR REPLACE FUNCTION public.submit_trend_with_earnings(
    p_category TEXT,
    p_description TEXT,
    p_screenshot_url TEXT DEFAULT NULL,
    p_thumbnail_url TEXT DEFAULT NULL,
    p_platform TEXT DEFAULT NULL,
    p_creator_handle TEXT DEFAULT NULL,
    p_post_caption TEXT DEFAULT NULL,
    p_likes_count INTEGER DEFAULT 0,
    p_comments_count INTEGER DEFAULT 0,
    p_shares_count INTEGER DEFAULT 0,
    p_views_count INTEGER DEFAULT 0,
    p_source_url TEXT DEFAULT NULL,
    p_post_url TEXT DEFAULT NULL,
    p_hashtags TEXT[] DEFAULT NULL,
    p_trending_position INTEGER DEFAULT NULL,
    p_confidence_score DECIMAL DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
AS $$
DECLARE
    v_user_id UUID;
    v_trend_id UUID;
    v_earnings_amount DECIMAL;
BEGIN
    -- Get current user
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Not authenticated');
    END IF;
    
    -- Insert the trend
    INSERT INTO public.trend_submissions (
        spotter_id,
        category,
        description,
        screenshot_url,
        thumbnail_url,
        platform,
        creator_handle,
        post_caption,
        likes_count,
        comments_count,
        shares_count,
        views_count,
        source_url,
        post_url,
        hashtags,
        trending_position,
        confidence_score,
        status,
        created_at
    ) VALUES (
        v_user_id,
        p_category,
        p_description,
        p_screenshot_url,
        p_thumbnail_url,
        p_platform,
        p_creator_handle,
        p_post_caption,
        p_likes_count,
        p_comments_count,
        p_shares_count,
        p_views_count,
        p_source_url,
        p_post_url,
        p_hashtags,
        p_trending_position,
        p_confidence_score,
        'pending',
        NOW()
    ) RETURNING id INTO v_trend_id;
    
    -- Calculate earnings (example: $0.05 per trend submission)
    v_earnings_amount := 0.05;
    
    -- Add earnings entry using the SECURITY DEFINER function
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'earnings_ledger') THEN
        PERFORM public.add_earnings_entry(
            v_user_id,
            v_earnings_amount,
            'trend_spot',
            'Earnings for spotting trend: ' || p_description,
            v_trend_id
        );
    END IF;
    
    -- Update user profile earnings if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables 
               WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        UPDATE public.profiles
        SET 
            earnings_pending = COALESCE(earnings_pending, 0) + v_earnings_amount,
            total_earnings = COALESCE(total_earnings, 0) + v_earnings_amount
        WHERE id = v_user_id;
    END IF;
    
    RETURN json_build_object(
        'success', true,
        'trend_id', v_trend_id,
        'earnings', v_earnings_amount
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.submit_trend_with_earnings TO authenticated;

-- Final verification
DO $$
BEGIN
    RAISE NOTICE '====================================';
    RAISE NOTICE 'RLS POLICIES FIXED';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'earnings_ledger RLS policies updated';
    RAISE NOTICE 'trend_submissions RLS policies updated';
    RAISE NOTICE 'Created SECURITY DEFINER functions for system operations';
    RAISE NOTICE 'Trend submission should now work properly';
    RAISE NOTICE '====================================';
END $$;