-- Fix infinite recursion in trend_validations RLS policies
-- The recursion happens when policies reference themselves or create circular dependencies

-- First, disable RLS temporarily to fix the policies
ALTER TABLE public.trend_validations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'trend_validations'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.trend_validations', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.trend_validations ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies
-- Policy 1: Anyone can view validations (no recursion possible here)
CREATE POLICY "view_all_validations" 
ON public.trend_validations 
FOR SELECT 
USING (true);

-- Policy 2: Authenticated users can insert their own validations
CREATE POLICY "insert_own_validations" 
ON public.trend_validations 
FOR INSERT 
WITH CHECK (
    auth.uid() IS NOT NULL 
    AND auth.uid() = validator_id
);

-- Policy 3: Users can update only their own validations
CREATE POLICY "update_own_validations" 
ON public.trend_validations 
FOR UPDATE 
USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = validator_id
);

-- Policy 4: Users can delete only their own validations
CREATE POLICY "delete_own_validations" 
ON public.trend_validations 
FOR DELETE 
USING (
    auth.uid() IS NOT NULL 
    AND auth.uid() = validator_id
);

-- Grant permissions
GRANT SELECT ON public.trend_validations TO anon;
GRANT ALL ON public.trend_validations TO authenticated;

-- Verify the policies are working
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'trend_validations';
EOF < /dev/null
