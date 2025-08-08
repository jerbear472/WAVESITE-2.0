-- Fix submission - Final version
-- First, let's see what ACTUALLY exists

-- 1. Show existing enum values
SELECT enumlabel as "Available Status Values"
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
ORDER BY enumsortorder;

-- 2. Simple, working RLS fix using minimal assumptions
DO $$
BEGIN
    -- Enable RLS
    ALTER TABLE trend_submissions ENABLE ROW LEVEL SECURITY;
    
    -- Drop ALL existing policies to start fresh
    DROP POLICY IF EXISTS "Users can insert their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update their own trend submissions" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON trend_submissions;
    DROP POLICY IF EXISTS "Enable read access for all users" ON trend_submissions;
    DROP POLICY IF EXISTS "Authenticated users can submit trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view relevant trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update their pending trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can delete their draft trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Allow authenticated users to submit trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can view trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can update own pending trends" ON trend_submissions;
    DROP POLICY IF EXISTS "Users can delete own drafts" ON trend_submissions;
    
    -- Create SIMPLE policies that will definitely work
    
    -- 1. INSERT - Most important for fixing submission
    CREATE POLICY "Anyone authenticated can submit" 
    ON trend_submissions 
    FOR INSERT 
    WITH CHECK (auth.uid() = spotter_id);
    
    -- 2. SELECT - Simple: users see their own trends
    CREATE POLICY "Users see own trends" 
    ON trend_submissions 
    FOR SELECT 
    USING (auth.uid() = spotter_id);
    
    -- 3. UPDATE - Users can update their own
    CREATE POLICY "Users update own trends" 
    ON trend_submissions 
    FOR UPDATE 
    USING (auth.uid() = spotter_id);
    
    -- 4. DELETE - Users can delete their own
    CREATE POLICY "Users delete own trends" 
    ON trend_submissions 
    FOR DELETE 
    USING (auth.uid() = spotter_id);
    
    RAISE NOTICE 'Simple RLS policies created successfully';
END $$;

-- 3. Verify policies are in place
SELECT 
    policyname as "Policy",
    cmd as "Operation",
    CASE 
        WHEN cmd = 'INSERT' THEN '🟢 ALLOWS SUBMISSION'
        WHEN cmd = 'SELECT' THEN '👁️ View own trends'
        WHEN cmd = 'UPDATE' THEN '✏️ Edit own trends'
        WHEN cmd = 'DELETE' THEN '🗑️ Delete own trends'
    END as "Effect"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'trend_submissions'
ORDER BY cmd;

-- 4. Make sure 'submitted' status exists (the one your form uses)
DO $$
BEGIN
    -- Only try to add if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'submitted' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status')
    ) THEN
        ALTER TYPE trend_status ADD VALUE 'submitted';
        RAISE NOTICE 'Added submitted to trend_status enum';
    ELSE
        RAISE NOTICE 'submitted already exists in enum';
    END IF;
END $$;

-- 5. Show final status
SELECT 
    '✅ READY TO SUBMIT!' as "Status",
    'RLS policies are now configured. You can submit trends.' as "Message";

-- 6. Optional: Show what status values are actually in the enum
SELECT 
    string_agg(enumlabel, ', ' ORDER BY enumsortorder) as "All Available Status Values"
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'trend_status');