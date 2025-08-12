-- Fix trend_validations table structure
-- This script checks and fixes the column naming inconsistency

-- First, check current structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trend_validations'
AND column_name IN ('trend_id', 'trend_submission_id')
ORDER BY column_name;

-- Check if trend_validations table exists at all
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trend_validations'
) as table_exists;

-- If the table doesn't exist, create it with the standard structure
CREATE TABLE IF NOT EXISTS trend_validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trend_id UUID REFERENCES trend_submissions(id) ON DELETE CASCADE,
    validator_id UUID REFERENCES users(id) ON DELETE CASCADE,
    confirmed BOOLEAN DEFAULT false,
    confidence_score DECIMAL(3,2),
    notes TEXT,
    evidence_url TEXT,
    reward_amount DECIMAL(10,2) DEFAULT 0.10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_id, validator_id)
);

-- If the table has trend_submission_id instead of trend_id, rename it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_submission_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trend_validations' 
        AND column_name = 'trend_id'
    ) THEN
        ALTER TABLE trend_validations 
        RENAME COLUMN trend_submission_id TO trend_id;
        
        RAISE NOTICE 'Renamed trend_submission_id to trend_id for consistency';
    END IF;
END $$;

-- Ensure the foreign key constraint exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'trend_validations'
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'trend_id'
    ) THEN
        ALTER TABLE trend_validations
        ADD CONSTRAINT fk_trend_validations_trend
        FOREIGN KEY (trend_id) REFERENCES trend_submissions(id) ON DELETE CASCADE;
        
        RAISE NOTICE 'Added foreign key constraint for trend_id';
    END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_validator ON trend_validations(validator_id);
CREATE INDEX IF NOT EXISTS idx_trend_validations_created ON trend_validations(created_at);

-- Enable RLS
ALTER TABLE trend_validations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies if they don't exist
DROP POLICY IF EXISTS "Anyone can view validations" ON trend_validations;
CREATE POLICY "Anyone can view validations"
ON trend_validations FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Authenticated users can validate" ON trend_validations;
CREATE POLICY "Authenticated users can validate"
ON trend_validations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = validator_id);

-- Verify the final structure
SELECT 
    'Final Structure:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trend_validations'
ORDER BY ordinal_position;

-- Check for any orphaned validations
SELECT 
    'Orphaned validations (where trend no longer exists):' as info,
    COUNT(*) as count
FROM trend_validations tv
LEFT JOIN trend_submissions ts ON tv.trend_id = ts.id
WHERE ts.id IS NULL;

-- Success message
SELECT '✅ trend_validations table structure fixed! Column is now standardized as trend_id' as status;