-- URGENT: Fix Earnings Display Issue
-- Run this ENTIRE script in Supabase SQL Editor

-- Step 1: Create earnings_ledger table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.earnings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    trend_id UUID REFERENCES public.trend_submissions(id) ON DELETE SET NULL,
    amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    approved_at TIMESTAMP WITH TIME ZONE,
    paid_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Step 2: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_user_id ON public.earnings_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_trend_id ON public.earnings_ledger(trend_id);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_status ON public.earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_earnings_ledger_created_at ON public.earnings_ledger(created_at DESC);

-- Step 3: Enable RLS
ALTER TABLE public.earnings_ledger ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Users can insert their own earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Users can update their own earnings" ON public.earnings_ledger;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.earnings_ledger;

-- Step 5: Create simple, permissive policies that WILL WORK
CREATE POLICY "Enable read access for users" ON public.earnings_ledger
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for users" ON public.earnings_ledger
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users" ON public.earnings_ledger
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Step 6: Grant permissions
GRANT ALL ON public.earnings_ledger TO authenticated;
GRANT ALL ON public.earnings_ledger TO service_role;

-- Step 7: IMPORTANT - Migrate existing trends to earnings_ledger
-- This creates earnings entries for all existing trend submissions that don't have them
INSERT INTO public.earnings_ledger (
    user_id,
    trend_id,
    amount,
    type,
    status,
    description,
    metadata,
    created_at
)
SELECT 
    ts.spotter_id as user_id,
    ts.id as trend_id,
    COALESCE(ts.payment_amount, 0.25) as amount,  -- Use payment_amount if stored, else default
    'trend_submission' as type,
    CASE 
        WHEN ts.status = 'approved' THEN 'approved'
        WHEN ts.status = 'rejected' THEN 'rejected'
        ELSE 'pending'
    END as status,
    CONCAT('Trend: ', COALESCE(ts.description, 'Untitled')) as description,
    jsonb_build_object(
        'category', ts.category,
        'quality_score', ts.quality_score,
        'validation_count', ts.validation_count
    ) as metadata,
    ts.created_at
FROM public.trend_submissions ts
WHERE NOT EXISTS (
    SELECT 1 FROM public.earnings_ledger el 
    WHERE el.trend_id = ts.id
)
AND ts.spotter_id IS NOT NULL;

-- Step 8: Create a trigger to automatically create earnings entries for new trends
CREATE OR REPLACE FUNCTION create_earnings_on_trend_submission()
RETURNS TRIGGER AS $$
BEGIN
    -- Create earnings ledger entry for new trend submission
    INSERT INTO public.earnings_ledger (
        user_id,
        trend_id,
        amount,
        type,
        status,
        description,
        metadata
    ) VALUES (
        NEW.spotter_id,
        NEW.id,
        COALESCE(NEW.payment_amount, 0.25),
        'trend_submission',
        'pending',
        CONCAT('Trend: ', COALESCE(NEW.description, 'Untitled')),
        jsonb_build_object(
            'category', NEW.category,
            'quality_score', NEW.quality_score
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS create_earnings_on_submission ON public.trend_submissions;

-- Create the trigger
CREATE TRIGGER create_earnings_on_submission
    AFTER INSERT ON public.trend_submissions
    FOR EACH ROW
    EXECUTE FUNCTION create_earnings_on_trend_submission();

-- Step 9: Check results
SELECT 
    'Total earnings entries' as metric,
    COUNT(*) as count
FROM public.earnings_ledger

UNION ALL

SELECT 
    'Total trend submissions' as metric,
    COUNT(*) as count
FROM public.trend_submissions

UNION ALL

SELECT 
    'Earnings for jeremyuys@gmail.com' as metric,
    COUNT(*) as count
FROM public.earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com';

-- Step 10: Show sample earnings for the user
SELECT 
    el.id,
    el.amount,
    el.type,
    el.status,
    el.description,
    el.created_at
FROM public.earnings_ledger el
JOIN auth.users u ON el.user_id = u.id
WHERE u.email = 'jeremyuys@gmail.com'
ORDER BY el.created_at DESC
LIMIT 10;