-- Cleanup null validation records
-- Run this in Supabase SQL Editor

-- First, let's see what we're about to delete
SELECT COUNT(*) as null_validations_count
FROM trend_validations
WHERE trend_submission_id IS NULL;

-- Delete validation records with null trend_submission_id
DELETE FROM trend_validations
WHERE trend_submission_id IS NULL;

-- Verify cleanup
SELECT COUNT(*) as remaining_null_validations
FROM trend_validations
WHERE trend_submission_id IS NULL;

-- Show validation stats after cleanup
SELECT 
    COUNT(*) as total_validations,
    COUNT(DISTINCT validator_id) as unique_validators,
    COUNT(DISTINCT trend_submission_id) as unique_trends_validated
FROM trend_validations;