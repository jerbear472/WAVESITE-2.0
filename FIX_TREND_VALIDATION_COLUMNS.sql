-- Fix the trend_validations table structure to match what the app expects

-- 1. Check current structure of trend_validations
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_validations'
ORDER BY ordinal_position;

-- 2. Check if we have trend_id or trend_submission_id
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_validations'
AND column_name IN ('trend_id', 'trend_submission_id');

-- 3. If trend_submission_id exists but not trend_id, add trend_id as an alias
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations'
        AND column_name = 'trend_submission_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'trend_validations'
        AND column_name = 'trend_id'
    ) THEN
        -- Add trend_id column that references the same data
        ALTER TABLE trend_validations 
        RENAME COLUMN trend_submission_id TO trend_id;
    END IF;
END $$;

-- 4. Ensure trend_submissions has the validation count columns
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending' CHECK (validation_status IN ('pending', 'approved', 'rejected'));

-- 5. Create a function to update counts after validation
CREATE OR REPLACE FUNCTION update_trend_validation_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update counts based on the trend_id
    UPDATE trend_submissions
    SET 
        approve_count = (
            SELECT COUNT(*) 
            FROM trend_validations 
            WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
            AND vote = 'verify'
        ),
        reject_count = (
            SELECT COUNT(*) 
            FROM trend_validations 
            WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
            AND vote = 'reject'
        ),
        validation_status = CASE
            WHEN (
                SELECT COUNT(*) 
                FROM trend_validations 
                WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
                AND vote = 'verify'
            ) >= 2 THEN 'approved'
            WHEN (
                SELECT COUNT(*) 
                FROM trend_validations 
                WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
                AND vote = 'reject'
            ) >= 2 THEN 'rejected'
            ELSE 'pending'
        END,
        status = CASE
            WHEN (
                SELECT COUNT(*) 
                FROM trend_validations 
                WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
                AND vote = 'verify'
            ) >= 2 THEN 'approved'
            WHEN (
                SELECT COUNT(*) 
                FROM trend_validations 
                WHERE trend_id = COALESCE(NEW.trend_id, NEW.trend_submission_id)
                AND vote = 'reject'
            ) >= 2 THEN 'rejected'
            WHEN status IN ('submitted', 'validating') THEN 'validating'
            ELSE status
        END
    WHERE id = COALESCE(NEW.trend_id, NEW.trend_submission_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Drop and recreate trigger
DROP TRIGGER IF EXISTS update_validation_counts_trigger ON trend_validations;
CREATE TRIGGER update_validation_counts_trigger
AFTER INSERT OR UPDATE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_counts();

-- 7. Update all existing counts
UPDATE trend_submissions ts
SET 
    approve_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations tv 
        WHERE (tv.trend_id = ts.id OR tv.trend_submission_id = ts.id)
        AND tv.vote = 'verify'
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations tv 
        WHERE (tv.trend_id = ts.id OR tv.trend_submission_id = ts.id)
        AND tv.vote = 'reject'
    ), 0),
    validation_status = CASE
        WHEN (
            SELECT COUNT(*) 
            FROM trend_validations tv 
            WHERE (tv.trend_id = ts.id OR tv.trend_submission_id = ts.id)
            AND tv.vote = 'verify'
        ) >= 2 THEN 'approved'
        WHEN (
            SELECT COUNT(*) 
            FROM trend_validations tv 
            WHERE (tv.trend_id = ts.id OR tv.trend_submission_id = ts.id)
            AND tv.vote = 'reject'
        ) >= 2 THEN 'rejected'
        ELSE 'pending'
    END;

-- 8. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_validations_trend_id ON trend_validations(trend_id);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation ON trend_submissions(validation_status, status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_counts ON trend_submissions(approve_count, reject_count);

-- 9. Grant proper permissions
GRANT SELECT, UPDATE ON trend_submissions TO authenticated;
GRANT SELECT, INSERT ON trend_validations TO authenticated;