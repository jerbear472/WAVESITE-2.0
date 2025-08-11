-- Fix for ambiguous reject_count and approve_count columns in validate page
-- The issue is that these columns might exist in multiple places

-- 1. First, check what columns exist in trend_submissions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'trend_submissions'
AND column_name IN ('approve_count', 'reject_count', 'validation_status')
ORDER BY column_name;

-- 2. Check if there are any views that might have these columns
SELECT 
    t.table_name,
    c.column_name
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
AND t.table_type = 'VIEW'
AND c.column_name IN ('approve_count', 'reject_count')
ORDER BY t.table_name, c.column_name;

-- 3. Add the columns if they don't exist
ALTER TABLE public.trend_submissions
ADD COLUMN IF NOT EXISTS approve_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS reject_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'pending';

-- 4. Create or replace the function that updates these counts
CREATE OR REPLACE FUNCTION update_trend_validation_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the counts on the trend_submissions table
    UPDATE trend_submissions
    SET 
        approve_count = (
            SELECT COUNT(*) 
            FROM trend_validations 
            WHERE trend_submission_id = NEW.trend_submission_id 
            AND vote = 'verify'
        ),
        reject_count = (
            SELECT COUNT(*) 
            FROM trend_validations 
            WHERE trend_submission_id = NEW.trend_submission_id 
            AND vote = 'reject'
        ),
        validation_status = CASE
            WHEN (SELECT COUNT(*) FROM trend_validations WHERE trend_submission_id = NEW.trend_submission_id AND vote = 'verify') >= 2 THEN 'approved'
            WHEN (SELECT COUNT(*) FROM trend_validations WHERE trend_submission_id = NEW.trend_submission_id AND vote = 'reject') >= 2 THEN 'rejected'
            ELSE 'pending'
        END
    WHERE id = NEW.trend_submission_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger if it doesn't exist
DROP TRIGGER IF EXISTS update_validation_counts_trigger ON trend_validations;
CREATE TRIGGER update_validation_counts_trigger
AFTER INSERT OR UPDATE ON trend_validations
FOR EACH ROW
EXECUTE FUNCTION update_trend_validation_counts();

-- 6. Update existing counts
UPDATE trend_submissions ts
SET 
    approve_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations tv 
        WHERE tv.trend_submission_id = ts.id 
        AND tv.vote = 'verify'
    ), 0),
    reject_count = COALESCE((
        SELECT COUNT(*) 
        FROM trend_validations tv 
        WHERE tv.trend_submission_id = ts.id 
        AND tv.vote = 'reject'
    ), 0),
    validation_status = CASE
        WHEN (SELECT COUNT(*) FROM trend_validations tv WHERE tv.trend_submission_id = ts.id AND tv.vote = 'verify') >= 2 THEN 'approved'
        WHEN (SELECT COUNT(*) FROM trend_validations tv WHERE tv.trend_submission_id = ts.id AND tv.vote = 'reject') >= 2 THEN 'rejected'
        ELSE 'pending'
    END;

-- 7. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_trend_submissions_validation_status ON trend_submissions(validation_status);
CREATE INDEX IF NOT EXISTS idx_trend_submissions_counts ON trend_submissions(approve_count, reject_count);

-- 8. Grant permissions
GRANT SELECT ON trend_submissions TO authenticated;
GRANT UPDATE (approve_count, reject_count, validation_status) ON trend_submissions TO authenticated;